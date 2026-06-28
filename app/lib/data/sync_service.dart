import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../domain/models.dart';
import 'health_source/health_source.dart';

class SyncResult {
  final int fetched;
  final int inserted;
  final Map<Metric, int> perMetric;
  const SyncResult({required this.fetched, required this.inserted, required this.perMetric});
}

/// Cursor-based catch-up sync: per metric, fetch samples newer than the last
/// synced timestamp, POST them to the backend, advance the cursor.
class SyncService {
  final HealthSource source;
  final ApiClient api;
  final String userId;
  static const _cursorPrefix = 'sync_cursor_';
  static const _maxLookback = Duration(days: 30);

  SyncService({required this.source, required this.api, required this.userId});

  Future<SyncResult> sync({Set<Metric>? metrics}) async {
    if (userId.isEmpty) {
      throw StateError('No userId configured (set --dart-define=USER_ID=...).');
    }
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    final wanted = metrics ?? Metric.values.toSet();

    final perMetric = <Metric, int>{};
    final toSend = <Sample>[];

    for (final metric in wanted) {
      final cursorIso = prefs.getString('$_cursorPrefix${metric.wire}');
      final from = cursorIso != null
          ? DateTime.parse(cursorIso)
          : now.subtract(_maxLookback);
      final samples = await source.fetchSamples(from: from, to: now, metrics: {metric});
      perMetric[metric] = samples.length;
      toSend.addAll(samples);
    }

    var inserted = 0;
    if (toSend.isNotEmpty) {
      inserted = await api.ingest(userId: userId, samples: toSend);
      // Advance each cursor to the latest sample seen for that metric.
      for (final metric in wanted) {
        final latest = toSend
            .where((s) => s.metric == metric)
            .fold<DateTime?>(null, (acc, s) => acc == null || s.endTs.isAfter(acc) ? s.endTs : acc);
        if (latest != null) {
          await prefs.setString('$_cursorPrefix${metric.wire}', latest.toUtc().toIso8601String());
        }
      }
    }

    return SyncResult(fetched: toSend.length, inserted: inserted, perMetric: perMetric);
  }
}
