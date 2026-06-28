// Domain models — mirror of packages/shared-types/src/index.ts.
// Keep these in sync with the backend contract.

enum Metric {
  heartRate,
  hrvRmssd,
  restingHeartRate,
  respiratoryRate,
  spo2,
  steps,
  activeEnergy,
  activeZoneMinutes,
  skinTemperature,
}

extension MetricWire on Metric {
  String get wire => switch (this) {
        Metric.heartRate => 'heart_rate',
        Metric.hrvRmssd => 'hrv_rmssd',
        Metric.restingHeartRate => 'resting_heart_rate',
        Metric.respiratoryRate => 'respiratory_rate',
        Metric.spo2 => 'spo2',
        Metric.steps => 'steps',
        Metric.activeEnergy => 'active_energy',
        Metric.activeZoneMinutes => 'active_zone_minutes',
        Metric.skinTemperature => 'skin_temperature',
      };
}

enum IngestSource { healthConnect, healthKit, googleHealthApi, takeout }

extension IngestSourceWire on IngestSource {
  String get wire => switch (this) {
        IngestSource.healthConnect => 'health_connect',
        IngestSource.healthKit => 'health_kit',
        IngestSource.googleHealthApi => 'google_health_api',
        IngestSource.takeout => 'takeout',
      };
}

class Sample {
  final Metric metric;
  final double value;
  final String unit;
  final DateTime startTs;
  final DateTime endTs;
  final IngestSource source;

  const Sample({
    required this.metric,
    required this.value,
    required this.unit,
    required this.startTs,
    required this.endTs,
    required this.source,
  });

  Map<String, dynamic> toJson() => {
        'metric': metric.wire,
        'value': value,
        'unit': unit,
        'startTs': startTs.toUtc().toIso8601String(),
        'endTs': endTs.toUtc().toIso8601String(),
        'source': source.wire,
      };
}

class RecoveryResult {
  final double value; // 0..100
  final bool provisional;
  const RecoveryResult({required this.value, required this.provisional});

  factory RecoveryResult.fromJson(Map<String, dynamic> j) => RecoveryResult(
        value: (j['value'] as num).toDouble(),
        provisional: j['provisional'] as bool? ?? false,
      );
}
