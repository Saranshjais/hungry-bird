import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'core/api_client.dart';
import 'services/hungry_bird_api.dart';
import 'services/local_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final store = await LocalStore.create();
  final api = HungryBirdApi(ApiClient());

  runApp(HungryBirdApp(store: store, api: api));
}
