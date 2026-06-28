import 'package:health/health.dart';

import '../../domain/models.dart';
import 'health_source.dart';
import 'metric_mapping.dart';

/// Android source backed by Health Connect via the `health` plugin.
///
/// Reads the data Google Health syncs from the Fitbit Air into Health Connect and
/// normalizes it to [Sample]. Which metrics are actually populated is verified by
/// the on-device probe (see HealthProbe) — some may be summary-only.
class HealthConnectSource implements HealthSource {
  final Health _health;
  bool _configured = false;

  HealthConnectSource({Health? health}) : _health = health ?? Health();

  @override
  IngestSource get kind => IngestSource.healthConnect;

  Future<void> _ensureConfigured() async {
    if (_configured) return;
    await _health.configure();
    _configured = true;
  }

  /// Numeric metrics we can map to a Health Connect type.
  static List<Metric> get supportedMetrics => metricToHealthType.entries
      .where((e) => e.value != null)
      .map((e) => e.key)
      .toList();

  @override
  Future<bool> requestPermissions() async {
    await _ensureConfigured();
    final types = allRequestedTypes();
    final perms = List.filled(types.length, HealthDataAccess.READ);
    return _health.requestAuthorization(types, permissions: perms);
  }

  @override
  Future<bool> hasPermissions() async {
    await _ensureConfigured();
    final types = allRequestedTypes();
    final perms = List.filled(types.length, HealthDataAccess.READ);
    return (await _health.hasPermissions(types, permissions: perms)) ?? false;
  }

  @override
  Future<List<Sample>> fetchSamples({
    required DateTime from,
    required DateTime to,
    Set<Metric>? metrics,
  }) async {
    await _ensureConfigured();
    final wanted = (metrics ?? supportedMetrics.toSet())
        .where((m) => metricToHealthType[m] != null)
        .toList();
    if (wanted.isEmpty) return const [];

    final typeByMetric = {for (final m in wanted) m: metricToHealthType[m]!};
    final points = await _health.getHealthDataFromTypes(
      types: typeByMetric.values.toList(),
      startTime: from,
      endTime: to,
    );

    final reverse = {for (final e in typeByMetric.entries) e.value: e.key};
    final out = <Sample>[];
    for (final p in points) {
      final metric = reverse[p.type];
      if (metric == null) continue;
      final value = p.value;
      if (value is! NumericHealthValue) continue;
      out.add(Sample(
        metric: metric,
        value: value.numericValue.toDouble(),
        unit: p.unit.name,
        startTs: p.dateFrom,
        endTs: p.dateTo,
        source: IngestSource.healthConnect,
      ));
    }
    return out;
  }
}
