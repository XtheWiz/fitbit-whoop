import 'package:flutter/material.dart';

import '../../domain/models.dart';

/// Detail view for a daily score. Renders recovery drivers or sleep stages from
/// the stored `inputs.result` breakdown.
class ScoreDetailScreen extends StatelessWidget {
  final DailyScore score;
  final Color color;
  const ScoreDetailScreen({super.key, required this.score, required this.color});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Text('${score.value.round()}$_unit',
                style: TextStyle(fontSize: 56, fontWeight: FontWeight.bold, color: color)),
          ),
          Center(child: Text('for ${score.day}', style: const TextStyle(color: Colors.grey))),
          const SizedBox(height: 24),
          ..._rows(context),
        ],
      ),
    );
  }

  String get _title => switch (score.kind) {
        'recovery' => 'Recovery',
        'sleep' => 'Sleep',
        'strain' => 'Strain',
        _ => score.kind,
      };

  String get _unit => score.kind == 'strain' ? '' : '%';

  List<Widget> _rows(BuildContext context) {
    if (score.kind == 'recovery') {
      final drivers = (score.result['drivers'] as Map<String, dynamic>?) ?? {};
      final provisional = score.result['provisional'] == true;
      return [
        if (provisional)
          const _Note('Provisional — fewer than 14 days of baseline so far.'),
        _bar('HRV', drivers['hrv'], 0.5),
        _bar('Resting HR', drivers['rhr'], 0.2),
        _bar('Respiratory rate', drivers['rr'], 0.1),
        _bar('Sleep', drivers['sleep'], 0.2),
      ];
    }
    if (score.kind == 'sleep') {
      final stages = (score.result['stages'] as Map<String, dynamic>?) ?? {};
      double h(String k) => ((stages[k] as num?)?.toDouble() ?? 0) / 3600000;
      return [
        _stat('Efficiency', _pct(score.result['efficiency'])),
        _stat('Duration vs need', _pct(score.result['durationVsNeed'])),
        _stat('Restorative (deep+REM)', _pct(score.result['restorative'])),
        _stat('Consistency', _pct(score.result['consistency'])),
        const Divider(height: 32),
        _stat('Deep', '${h('deepMs').toStringAsFixed(1)} h'),
        _stat('REM', '${h('remMs').toStringAsFixed(1)} h'),
        _stat('Light', '${h('lightMs').toStringAsFixed(1)} h'),
        _stat('Awake', '${h('awakeMs').toStringAsFixed(1)} h'),
      ];
    }
    return [const _Note('No breakdown available.')];
  }

  Widget _bar(String label, dynamic contribution, double weight) {
    final c = (contribution as num?)?.toDouble() ?? 0;
    final frac = weight == 0 ? 0.0 : (c / weight).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label  ·  ${(frac * 100).round()}%'),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(value: frac, minHeight: 8, color: color),
          ),
        ],
      ),
    );
  }

  static String _pct(dynamic v) => '${(((v as num?)?.toDouble() ?? 0) * 100).round()}%';

  Widget _stat(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [Text(label), Text(value, style: const TextStyle(fontWeight: FontWeight.bold))],
        ),
      );
}

class _Note extends StatelessWidget {
  final String text;
  const _Note(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(text, style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.orange)),
      );
}
