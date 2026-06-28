import '../../domain/models.dart';
import 'health_source.dart';

/// Android source backed by Health Connect (via the `health` package).
///
/// Phase 1: interface-complete stub so the app shell compiles and the seam is in
/// place. Phase 2 wires the real `health` plugin and resolves which metrics Google
/// Health actually writes to Health Connect for the Fitbit Air (see plan, risks).
class HealthConnectSource implements HealthSource {
  @override
  IngestSource get kind => IngestSource.healthConnect;

  /// Metrics we will request once the real plugin is wired in Phase 2.
  static const requested = <Metric>{
    Metric.heartRate,
    Metric.hrvRmssd,
    Metric.restingHeartRate,
    Metric.respiratoryRate,
    Metric.spo2,
    Metric.steps,
    Metric.activeEnergy,
  };

  @override
  Future<bool> requestPermissions() async {
    // TODO(phase-2): Health().requestAuthorization(types, permissions: read)
    return false;
  }

  @override
  Future<bool> hasPermissions() async => false;

  @override
  Future<List<Sample>> fetchSamples({
    required DateTime from,
    required DateTime to,
    Set<Metric>? metrics,
  }) async {
    // TODO(phase-2): Health().getHealthDataFromTypes(...) -> normalize to Sample.
    return const [];
  }
}
