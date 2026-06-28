import '../../domain/models.dart';

/// The seam between platform health APIs and the rest of the app.
///
/// Implementations: [HealthConnectSource] (Android), HealthKitSource (iOS, later),
/// GoogleHealthApiSource (cloud, future), TakeoutImportSource (backfill).
/// The app and sync layer depend ONLY on this interface — see AGENTS.md.
abstract interface class HealthSource {
  /// Which device API this source reads from.
  IngestSource get kind;

  /// Request the read permissions this source needs. Returns true if granted.
  Future<bool> requestPermissions();

  /// Whether permissions are currently granted.
  Future<bool> hasPermissions();

  /// Pull normalized samples in [from, to). Cursor management is the caller's job.
  Future<List<Sample>> fetchSamples({
    required DateTime from,
    required DateTime to,
    Set<Metric>? metrics,
  });
}
