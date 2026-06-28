import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../config.dart';
import '../../data/health_source/health_connect_source.dart';
import '../../data/sync_service.dart';
import '../../domain/models.dart';
import '../diagnostics/probe_screen.dart';
import '../scores/score_detail_screen.dart';

const _recoveryColor = Color(0xFF16C784);
const _strainColor = Color(0xFF2E7BFF);
const _sleepColor = Color(0xFF8A5CF6);

/// Home: three-ring overview backed by real scores from the API, plus Health
/// Connect sync and the diagnostics probe.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient(baseUrl: Uri.parse(Config.apiBaseUrl));
  Map<String, DailyScore> _scores = {};
  bool _syncing = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (Config.userId.isNotEmpty) _load();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final scores = await _api.latestScores(Config.userId);
      if (mounted) setState(() => _scores = scores);
    } catch (_) {
      // surfaced via empty cards; sync/probe report errors explicitly
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sync() async {
    setState(() => _syncing = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final source = HealthConnectSource();
      if (!await source.requestPermissions()) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Health Connect permission needed. Allow Recover to read your data.')));
        return;
      }
      final sync = SyncService(source: source, api: _api, userId: Config.userId);
      final result = await sync.sync();
      final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
      await _api.computeDay(userId: Config.userId, day: today);
      await _load();
      messenger.showSnackBar(SnackBar(
          content: Text('Synced ${result.fetched} samples · ${result.inserted} stored')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Sync failed: $e')));
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final noUser = Config.userId.isEmpty;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recover'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: noUser || _loading ? null : _load,
          ),
          IconButton(
            tooltip: 'Health Connect probe',
            icon: const Icon(Icons.science_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProbeScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _syncing ? null : _sync,
        icon: _syncing
            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.sync),
        label: Text(_syncing ? 'Syncing…' : 'Sync'),
      ),
      body: RefreshIndicator(
        onRefresh: noUser ? () async {} : _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (noUser) const _Note('No USER_ID configured. Run with --dart-define=USER_ID=<uuid> (see `bun run seed`).'),
            _ScoreCard(
              title: 'Recovery',
              score: _scores['recovery'],
              unit: '%',
              color: _recoveryColor,
              hint: 'How ready your body is today',
            ),
            const SizedBox(height: 12),
            _ScoreCard(
              title: 'Sleep',
              score: _scores['sleep'],
              unit: '%',
              color: _sleepColor,
              hint: 'Last night vs. your need',
            ),
            const SizedBox(height: 12),
            _ScoreCard(
              title: 'Day Strain',
              score: _scores['strain'],
              unit: '/21',
              color: _strainColor,
              hint: 'Cardiovascular load (Phase 4)',
            ),
            const SizedBox(height: 24),
            _BalanceCard(recovery: _scores['recovery'], strain: _scores['strain']),
            const SizedBox(height: 12),
            _AssistantCard(recovery: _scores['recovery']),
          ],
        ),
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  final String title, unit, hint;
  final Color color;
  final DailyScore? score;
  const _ScoreCard({
    required this.title,
    required this.unit,
    required this.color,
    required this.hint,
    required this.score,
  });

  @override
  Widget build(BuildContext context) {
    final value = score == null ? '—' : score!.value.round().toString();
    return Card(
      child: ListTile(
        onTap: score == null
            ? null
            : () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ScoreDetailScreen(score: score!, color: color))),
        leading: CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.15),
            child: Icon(Icons.favorite, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(hint),
        trailing: Text.rich(TextSpan(children: [
          TextSpan(text: value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)),
          TextSpan(text: ' $unit', style: const TextStyle(color: Colors.grey)),
        ])),
      ),
    );
  }
}

/// Compares today's strain against a recovery-appropriate target (Whoop's
/// strain-vs-recovery idea): higher recovery supports more strain.
class _BalanceCard extends StatelessWidget {
  final DailyScore? recovery;
  final DailyScore? strain;
  const _BalanceCard({this.recovery, this.strain});

  @override
  Widget build(BuildContext context) {
    if (recovery == null || strain == null) return const SizedBox.shrink();
    final target = (recovery!.value / 100) * 21; // recovery-scaled optimal strain
    final actual = strain!.value;
    final delta = actual - target;
    final (label, color) = delta > 3
        ? ('Overreaching — strain is above what your recovery supports', Colors.orange)
        : delta < -3
            ? ('Room to push — you\'re under your recovery-appropriate strain', _recoveryColor)
            : ('Balanced — strain matches your recovery today', _strainColor);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Strain vs. recovery', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Today ${actual.round()}/21'),
                Text('Target ${target.round()}/21', style: const TextStyle(color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (actual / 21).clamp(0.0, 1.0),
                minHeight: 8,
                color: color,
              ),
            ),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color)),
          ],
        ),
      ),
    );
  }
}

class _AssistantCard extends StatelessWidget {
  final DailyScore? recovery;
  const _AssistantCard({this.recovery});

  @override
  Widget build(BuildContext context) {
    final text = recovery == null
        ? 'Sync your Fitbit Air to see your personalized morning briefing.'
        : 'Recovery is ${recovery!.value.round()}%. ${_advice(recovery!.value)}';
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.auto_awesome, size: 20),
              SizedBox(width: 8),
              Text('Morning briefing', style: TextStyle(fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 8),
            Text(text),
          ],
        ),
      ),
    );
  }

  static String _advice(double v) {
    if (v >= 67) return 'You\'re primed — a good day to push hard.';
    if (v >= 34) return 'Moderate readiness — train, but keep something in reserve.';
    return 'Low readiness — prioritize recovery today.';
  }
}

class _Note extends StatelessWidget {
  final String text;
  const _Note(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Text(text, style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.orange)),
      );
}
