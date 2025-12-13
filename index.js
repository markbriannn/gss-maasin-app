/**
 * @format
 */

// Polyfill for TextEncoder/TextDecoder required by Firebase JS SDK 12.x on Hermes
import 'text-encoding-polyfill';

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
import App from './App';

AppRegistry.registerComponent(appName, () => App);
