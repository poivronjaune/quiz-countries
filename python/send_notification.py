import urllib.request
import urllib.parse

def send_notification():
    # 1. Replace with your unique topic name (make it hard to guess so others don't post to it)
    topic = "insert topic here"
    
    # 2. Your notification message
    message = "Hello from b! This is your daily reminder."
    
    # ntfy.sh endpoint URL
    url = f"https://ntfy.sh/{topic}"
    
    # Prepare the request
    data = message.encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    
    # Optional: Add a title and priority headers
    req.add_header("Title", "Linux Server Alert")
    req.add_header("Priority", "default") # options: min, low, default, high, urgent
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("Notification sent successfully!")
    except Exception as e:
        print(f"Failed to send notification: {e}")

if __name__ == "__main__":
    send_notification()