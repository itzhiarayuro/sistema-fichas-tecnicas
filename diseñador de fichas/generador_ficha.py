from googleapiclient.discovery import build
import pandas as pd

# Obtén tu API Key desde: https://console.cloud.google.com/
API_KEY = "AIzaSyADSd9GM3bjM9MdOJ2TwOPvtMPRC71JuOI"

youtube = build('youtube', 'v3', developerKey=API_KEY)

# Obtener ID del canal desde la URL
CHANNEL_URL = "https://www.youtube.com/@sanchezdeboeck/videos"
CHANNEL_HANDLE = "sanchezdeboeck"  # El nombre después de @

# Buscar el ID del canal por handle
channels_response = youtube.search().list(
    part='snippet',
    q=CHANNEL_HANDLE,
    type='channel',
    maxResults=1
).execute()

CHANNEL_ID = channels_response['items'][0]['snippet']['channelId']
print(f"Canal ID encontrado: {CHANNEL_ID}")

# Obtener playlist de uploads
channel_response = youtube.channels().list(
    part='contentDetails',
    id=CHANNEL_ID
).execute()

uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']

# ... (código anterior igual hasta la parte de extracción) ...

# Extraer IDs y metadatos básicos
video_data = []
next_page_token = None

print("Extrayendo lista de videos...")
while True:
    playlist_response = youtube.playlistItems().list(
        part='snippet,contentDetails',
        playlistId=uploads_playlist_id,
        maxResults=50,
        pageToken=next_page_token
    ).execute()
    
    for item in playlist_response['items']:
        video_data.append({
            'video_id': item['contentDetails']['videoId'],
            'title': item['snippet']['title'],
            'published_at': item['snippet']['publishedAt'],
            'url': f"https://www.youtube.com/watch?v={item['contentDetails']['videoId']}"
        })
    
    next_page_token = playlist_response.get('nextPageToken')
    if not next_page_token:
        break

# Función para convertir duración ISO 8601 (PT#H#M#S) a formato legible
import re
def parse_duration(duration):
    hours = re.search(r'(\d+)H', duration)
    minutes = re.search(r'(\d+)M', duration)
    seconds = re.search(r'(\d+)S', duration)
    
    hours = int(hours.group(1)) if hours else 0
    minutes = int(minutes.group(1)) if minutes else 0
    seconds = int(seconds.group(1)) if seconds else 0
    
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# Obtener DURACIÓN en batches de 50 (límite de la API)
print("Obteniendo duración de los videos...")
all_videos_with_time = []
for i in range(0, len(video_data), 50):
    batch = video_data[i:i+50]
    video_ids = [v['video_id'] for v in batch]
    
    video_response = youtube.videos().list(
        part='contentDetails',
        id=','.join(video_ids)
    ).execute()
    
    # Crear un mapa de ID -> Duración
    durations = {item['id']: parse_duration(item['contentDetails']['duration']) 
                 for item in video_response['items']}
    
    # Combinar datos
    for video in batch:
        video['duration'] = durations.get(video['video_id'], "00:00:00")
        all_videos_with_time.append(video)

# Guardar resultados
df = pd.DataFrame(all_videos_with_time)
df.to_csv('videos_sanchezdeboeck.csv', index=False)

print(f"\n✅ Total de videos extraídos: {len(all_videos_with_time)}")
print(df[['title', 'duration', 'url']].head())

