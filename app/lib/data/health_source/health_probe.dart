import 'package:health/health.dart';

import 'metric_mapping.dart';

/// Availability result for one Health Connect data type.
class ProbeResult {
  final HealthDataType type;
  final int count;
  final DateTime? earliest;
  final DateTime? latest;
  final num? sampleValue;
  final String? unit;
  final String? error;

  const ProbeResult({
    required this.type,
    required this.count,
    this.earliest,
    this.latest,
    this.sampleValue,
    this.unit,
    this.error,
  });

  bool get available => count > 0;
}

/// Diagnostic that answers the Phase-2 hard unknown: which metrics does Google
/// Health actually write to Health Connect for THIS user's Fitbit Air, and at what
/// granularity. Run on a real device with the Air synced. Read-only.
class HealthProbe {
  final Health _health;
  HealthProbe({Health? health}) : _health = health ?? Health();

  Future<List<ProbeResult>> run({int days = 7}) async {
    await _health.configure();
    final end = DateTime.now();
    final start = end.subtract(Duration(days: days));

    final types = <HealthDataType>[
      ...metricToHealthType.values.whereType<HealthDataType>(),
      ...sleepHealthTypes,
    ];

    final results = <ProbeResult>[];
    for (final type in types) {
      try {
        final points = await _health.getHealthDataFromTypes(
          types: [type],
          startTime: start,
          endTime: end,
        );
        if (points.isEmpty) {
          results.add(ProbeResult(type: type, count: 0));
          continue;
        }
        points.sort((a, b) => a.dateFrom.compareTo(b.dateFrom));
        final first = points.first;
        final v = first.value;
        results.add(ProbeResult(
          type: type,
          count: points.length,
          earliest: first.dateFrom,
          latest: points.last.dateTo,
          sampleValue: v is NumericHealthValue ? v.numericValue : null,
          unit: first.unit.name,
        ));
      } catch (e) {
        results.add(ProbeResult(type: type, count: 0, error: e.toString()));
      }
    }
    return results;
  }
}
