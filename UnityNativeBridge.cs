// UnityNativeBridge.cs - Unity 측 통신 코드 예시
using System;
using System.Runtime.InteropServices;
using UnityEngine;

public class UnityNativeBridge : MonoBehaviour
{
    // iOS Native 메서드 선언
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void SendEventToNative(string eventName, string data);
#else
    private static void SendEventToNative(string eventName, string data) 
    {
        Debug.Log($"[Unity] Mock SendEventToNative: {eventName} - {data}");
    }
#endif

    private static UnityNativeBridge _instance;
    public static UnityNativeBridge Instance
    {
        get
        {
            if (_instance == null)
            {
                var go = new GameObject("UnityNativeBridge");
                _instance = go.AddComponent<UnityNativeBridge>();
                DontDestroyOnLoad(go);
            }
            return _instance;
        }
    }

    private void Awake()
    {
        if (_instance != null && _instance != this)
        {
            Destroy(gameObject);
            return;
        }
        _instance = this;
        DontDestroyOnLoad(gameObject);
    }

    // Native에서 호출될 메서드들
    public void StartGame(string jsonData)
    {
        Debug.Log($"[Unity] StartGame called with: {jsonData}");
        
        try
        {
            // JSON 파싱 및 게임 시작 로직
            var data = JsonUtility.FromJson<GameStartData>(jsonData);
            // 게임 시작 처리...
            
            // 성공 이벤트 전송
            SendEventToNative("GameStarted", JsonUtility.ToJson(new { 
                success = true, 
                timestamp = DateTimeOffset.Now.ToUnixTimeSeconds() 
            }));
        }
        catch (Exception e)
        {
            Debug.LogError($"[Unity] StartGame error: {e.Message}");
            SendEventToNative("GameError", JsonUtility.ToJson(new { 
                error = e.Message 
            }));
        }
    }

    public void ResetGame(string jsonData)
    {
        Debug.Log("[Unity] ResetGame called");
        // 게임 리셋 로직
        SendEventToNative("GameReset", "{}");
    }

    public void UpdatePlayerData(string jsonData)
    {
        Debug.Log($"[Unity] UpdatePlayerData: {jsonData}");
        // 플레이어 데이터 업데이트
    }

    // Unity에서 Native로 이벤트 전송
    public static void SendEvent(string eventName, object data = null)
    {
        string jsonData = data != null ? JsonUtility.ToJson(data) : "{}";
        SendEventToNative(eventName, jsonData);
    }

    // 예시: 점수 전송
    public static void SendScore(int score)
    {
        SendEvent("PlayerScored", new { score = score, timestamp = DateTimeOffset.Now.ToUnixTimeSeconds() });
    }

    // 예시: 게임 오버
    public static void SendGameOver(string reason)
    {
        SendEvent("GameOver", new { reason = reason, timestamp = DateTimeOffset.Now.ToUnixTimeSeconds() });
    }

    [Serializable]
    public class GameStartData
    {
        public long timestamp;
        public string userId;
    }
}

// iOS Native 플러그인 파일 (Plugins/iOS/UnityNativePlugin.mm)
/*
#import <Foundation/Foundation.h>
#import "UnityFramework/UnityFramework-Swift.h"

extern "C" {
    void SendEventToNative(const char* eventName, const char* data) {
        NSString *nsEventName = [NSString stringWithUTF8String:eventName];
        NSString *nsData = [NSString stringWithUTF8String:data];
        
        // Swift Unity 클래스의 receiveUnityEvent 메서드 호출
        [[Unity shared] receiveUnityEvent:nsEventName data:nsData];
    }
}
*/
