import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../domain/models.dart';

/// Typed client for the Bun/Elysia backend. Mirrors server routes.
/// The TS web client uses Eden Treaty against the same `App` type; Flutter mirrors
/// the contract via domain/models.dart.
class ApiClient {
  final Uri baseUrl;
  final String token;
  final http.Client _http;

  ApiClient({required this.baseUrl, String? token, http.Client? client})
      : token = token ?? Config.apiToken,
        _http = client ?? http.Client();

  Map<String, String> _headers({bool json = false}) => {
        if (json) 'content-type': 'application/json',
        if (token.isNotEmpty) 'authorization': 'Bearer $token',
      };

  Future<bool> health() async {
    final res = await _http.get(baseUrl.resolve('/health'), headers: _headers());
    if (res.statusCode != 200) return false;
    return (jsonDecode(res.body) as Map<String, dynamic>)['ok'] == true;
  }

  Future<int> ingest({required String userId, required List<Sample> samples}) async {
    final res = await _http.post(
      baseUrl.resolve('/ingest'),
      headers: _headers(json: true),
      body: jsonEncode({
        'userId': userId,
        'samples': samples.map((s) => s.toJson()).toList(),
      }),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (body['inserted'] as num?)?.toInt() ?? 0;
  }

  /// Latest score per kind (recovery/sleep/strain), keyed by kind.
  Future<Map<String, DailyScore>> latestScores(String userId) async {
    final res = await _http.get(
      baseUrl.resolve('/scores/latest?userId=$userId'),
      headers: _headers(),
    );
    if (res.statusCode != 200) return {};
    final list = jsonDecode(res.body) as List<dynamic>;
    final out = <String, DailyScore>{};
    for (final e in list) {
      final s = DailyScore.fromJson(e as Map<String, dynamic>);
      out[s.kind] = s;
    }
    return out;
  }

  /// Trigger server-side compute for a day (after a sync).
  Future<void> computeDay({required String userId, required String day}) async {
    await _http.post(
      baseUrl.resolve('/scores/compute'),
      headers: _headers(json: true),
      body: jsonEncode({'userId': userId, 'day': day}),
    );
  }

  Future<String> generateSummary({
    required Map<String, dynamic> context,
    required String window, // morning | midday | evening
  }) async {
    final res = await _http.post(
      baseUrl.resolve('/summaries/generate'),
      headers: _headers(json: true),
      body: jsonEncode({'context': context, 'window': window}),
    );
    return (jsonDecode(res.body) as Map<String, dynamic>)['text'] as String;
  }

  void close() => _http.close();
}
