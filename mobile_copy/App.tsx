import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { Text, View, StyleSheet } from 'react-native'
import Constants from 'expo-constants'

async function registerPush() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null
  const token = (await Notifications.getDevicePushTokenAsync()).data
  return token
}

export default function App() {
  const [loc,setLoc] = useState<Location.LocationObjectCoords|null>(null)
  const [data,setData] = useState<any|null>(null)

  useEffect(() => {
    (async()=>{
      const { status } = await Location.requestForegroundPermissionsAsync()
      if(status!=='granted') return
      const l = await Location.getCurrentPositionAsync({})
      setLoc(l.coords)
      const token = await registerPush()
      if(token) {
        await fetch(`${Constants.expoConfig?.extra?.apiBase}/register_token`,
          {method:'POST', headers:{'Content-Type':'application/json'},
           body:JSON.stringify({uid:'demo',token})})
      }
    })()
  },[])

  useEffect(()=>{
    if(!loc) return
    fetch(`${Constants.expoConfig?.extra?.apiBase}/compare?lat=${loc.latitude}&lon=${loc.longitude}`)
      .then(r=>r.json()).then(setData)
  },[loc])

  if(!data) return <Text>Loading…</Text>
  return (
    <View style={styles.container}>
      <Text style={styles.big}>{data.now.toFixed(1)} °C</Text>
      <Text style={styles.delta}>
        {data.delta>0?`+${data.delta}`:data.delta} °C vs 어제
      </Text>
    </View>
  )
}
const styles = StyleSheet.create({
  container:{flex:1,justifyContent:'center',alignItems:'center'},
  big:{fontSize:42,fontWeight:'700'},
  delta:{fontSize:18,marginTop:8}
}) 