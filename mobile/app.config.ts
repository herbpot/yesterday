import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  ...config,
    "name": "어제보다",
    "slug": "yesterday",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "plugins": [
        [
            "react-native-google-mobile-ads",
            {
                "android_app_id": process.env.GOOGLE_ADMOB_APP_ID
            }
        ]
    ],
    "react-native-google-mobile-ads":{
        "android_app_id": process.env.GOOGLE_ADMOB_APP_ID
    },
    "splash": {
        "image": "./assets/splash-icon.png",
        "resizeMode": "contain",
        "backgroundColor": "#ffffff"
    },
    "ios": {
        "supportsTablet": true
    },
    "android": {
        "adaptiveIcon": {
            "foregroundImage": "./assets/adaptive-icon.png",
            "backgroundColor": "#ffffff"
        },
        "edgeToEdgeEnabled": true,
        "package": "com.herb05.yesterday",
    },
    "web": {
        "favicon": "./assets/favicon.png"
    },
    "extra": {
        "eas": {
            "projectId": process.env.APP_ID
        },
        "EXPO_PUBLIC_API_BASE": "https://yesterday-94136ff83a00.herokuapp.com/"
    }
  }
)  