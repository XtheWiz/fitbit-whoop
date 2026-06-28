import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../config.dart';
import '../../data/health_source/health_connect_source.dart';
import '../../data/sync_service.dart';
import '../diagnostics/probe_screen.dart';

/// Phase 1 shell + Phase 2 sync: the three-ring overview plus Health Connect
/// sync and the diagnostics probe. Real scores land in Phase 3+.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _syncing = false;

  Future<void> _sync() async {
    setState(() => _syncing = true);
    final messenger = ScaffoldMessenger.of(context);
    final api = ApiClient(baseUrl: Uri.parse(Config.apiBaseUrl));
    try {
      final source = HealthConnectSource();
      if (!await source.requestPermissions()) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Health Connect permission needed. Allow Recover to read your data.')));
        return;
      }
      final sync = SyncService(source: source, api: api, userId: Config.userId);
      final result = await sync.sync();
      messenger.showSnackBar(SnackBar(
          content: Text('Synced ${result.fetched} samples · ${result.inserted} stored')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Sync failed: $e')));
    } finally {
      api.close();
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recover'),
        actions: [
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
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _ScoreCard(
            title: 'Recovery',
            value: '—',
            unit: '%',
            color: Color(0xFF16C784),
            hint: 'How ready your body is today',
          ),
          SizedBox(height: 12),
          _ScoreCard(
            title: 'Day Strain',
            value: '—',
            unit: '/21',
            color: Color(0xFF2E7BFF),
            hint: 'Cardiovascular load so far',
          ),
          SizedBox(height: 12),
          _ScoreCard(
            title: 'Sleep',
            value: '—',
            unit: '%',
            color: Color(0xFF8A5CF6),
            hint: 'Last night vs. your need',
          ),
          SizedBox(height: 24),
          _AssistantCard(),
        ],
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  final String title, value, unit, hint;
  final Color color;
  const _ScoreCard({
    required this.title,
    required this.value,
    required this.unit,
    required this.color,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.15),
            child: Icon(Icons.favorite, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(hint),
        trailing: Text.rich(TextSpan(children: [
          TextSpan(
              text: value,
              style: TextStyle(
                  fontSize: 28, fontWeight: FontWeight.bold, color: color)),
          TextSpan(text: ' $unit', style: const TextStyle(color: Colors.grey)),
        ])),
      ),
    );
  }
}

class _AssistantCard extends StatelessWidget {
  const _AssistantCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.auto_awesome, size: 20),
              SizedBox(width: 8),
              Text('Morning briefing',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ]),
            SizedBox(height: 8),
            Text(
                'Connect your Fitbit Air and tap Sync to pull your data, then run the probe (top-right) to see which metrics are available.'),
          ],
        ),
      ),
    );
  }
}
