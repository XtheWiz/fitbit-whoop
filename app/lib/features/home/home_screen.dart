import 'package:flutter/material.dart';

/// Phase 1 shell: the three-ring overview (Recovery / Strain / Sleep) plus the
/// assistant summary slot. Real data lands in Phase 2+.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recover')),
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
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.15),
            child: Icon(Icons.favorite, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(hint),
        trailing: Text.rich(TextSpan(children: [
          TextSpan(text: value, style: TextStyle(
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
              Text('Morning briefing', style: TextStyle(fontWeight: FontWeight.bold)),
            ]),
            SizedBox(height: 8),
            Text('Connect your Fitbit Air to see your personalized health summary.'),
          ],
        ),
      ),
    );
  }
}
