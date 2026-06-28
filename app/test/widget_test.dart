import 'package:flutter_test/flutter_test.dart';

import 'package:recover/main.dart';

void main() {
  testWidgets('home shows the three score cards', (tester) async {
    await tester.pumpWidget(const RecoverApp());

    expect(find.text('Recover'), findsOneWidget);
    expect(find.text('Recovery'), findsOneWidget);
    expect(find.text('Day Strain'), findsOneWidget);
    expect(find.text('Sleep'), findsOneWidget);
  });
}
