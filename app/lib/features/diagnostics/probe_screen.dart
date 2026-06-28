import 'package:flutter/material.dart';
import 'package:health/health.dart';

import '../../data/health_source/health_connect_source.dart';
import '../../data/health_source/health_probe.dart';

/// On-device diagnostics: grant Health Connect access, then probe which metrics
/// the Fitbit Air actually populates. This is how we resolve the Phase-2 unknown.
class ProbeScreen extends StatefulWidget {
  const ProbeScreen({super.key});

  @override
  State<ProbeScreen> createState() => _ProbeScreenState();
}

class _ProbeScreenState extends State<ProbeScreen> {
  final _source = HealthConnectSource();
  final _probe = HealthProbe();
  List<ProbeResult>? _results;
  bool _busy = false;
  String? _status;

  Future<void> _run() async {
    setState(() {
      _busy = true;
      _status = 'Requesting Health Connect permissions…';
    });
    try {
      final granted = await _source.requestPermissions();
      if (!granted) {
        setState(() => _status = 'Permission not granted. Open Health Connect and allow Recover to read your data.');
        return;
      }
      setState(() => _status = 'Probing last 7 days…');
      final results = await _probe.run(days: 7);
      setState(() {
        _results = results;
        _status = '${results.where((r) => r.available).length}/${results.length} types have data';
      });
    } catch (e) {
      setState(() => _status = 'Error: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Health Connect probe')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FilledButton.icon(
                  onPressed: _busy ? null : _run,
                  icon: _busy
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.search),
                  label: const Text('Grant access & probe'),
                ),
                if (_status != null) Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_status!, style: Theme.of(context).textTheme.bodyMedium),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _results == null
                ? const Center(child: Text('Run the probe to see which metrics your Air provides.'))
                : ListView.separated(
                    itemCount: _results!.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (_, i) => _ResultTile(_results![i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _ResultTile extends StatelessWidget {
  final ProbeResult r;
  const _ResultTile(this.r);

  @override
  Widget build(BuildContext context) {
    final ok = r.available;
    return ListTile(
      leading: Icon(
        r.error != null ? Icons.error_outline : (ok ? Icons.check_circle : Icons.remove_circle_outline),
        color: r.error != null ? Colors.orange : (ok ? const Color(0xFF16C784) : Colors.grey),
      ),
      title: Text(_label(r.type)),
      subtitle: Text(
        r.error != null
            ? r.error!
            : ok
                ? '${r.count} samples · e.g. ${r.sampleValue ?? '—'} ${r.unit ?? ''} · latest ${r.latest?.toLocal().toString().split('.').first ?? '—'}'
                : 'no data in last 7 days',
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  static String _label(HealthDataType t) => t.name
      .toLowerCase()
      .split('_')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}
