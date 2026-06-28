import 'package:health/health.dart';

import '../../domain/models.dart';

/// Single source of truth mapping our [Metric] domain enum to the `health`
/// package's [HealthDataType]. Used by both the ingestion source and the probe.
/// Metrics with no direct Health Connect type (e.g. active zone minutes) map to null.
const Map<Metric, HealthDataType?> metricToHealthType = {
  Metric.heartRate: HealthDataType.HEART_RATE,
  Metric.hrvRmssd: HealthDataType.HEART_RATE_VARIABILITY_RMSSD,
  Metric.restingHeartRate: HealthDataType.RESTING_HEART_RATE,
  Metric.respiratoryRate: HealthDataType.RESPIRATORY_RATE,
  Metric.spo2: HealthDataType.BLOOD_OXYGEN,
  Metric.steps: HealthDataType.STEPS,
  Metric.activeEnergy: HealthDataType.ACTIVE_ENERGY_BURNED,
  Metric.activeZoneMinutes: null, // no direct HC type; derive from intraday HR
  Metric.skinTemperature: HealthDataType.SKIN_TEMPERATURE,
};

/// Sleep stages live in their own Health Connect types (handled separately from
/// numeric samples). Listed here so the probe can report their availability.
const List<HealthDataType> sleepHealthTypes = [
  HealthDataType.SLEEP_SESSION,
  HealthDataType.SLEEP_ASLEEP,
  HealthDataType.SLEEP_LIGHT,
  HealthDataType.SLEEP_DEEP,
  HealthDataType.SLEEP_REM,
  HealthDataType.SLEEP_AWAKE,
];

/// All read types the app requests authorization for.
List<HealthDataType> allRequestedTypes() => [
      ...metricToHealthType.values.whereType<HealthDataType>(),
      ...sleepHealthTypes,
    ];
