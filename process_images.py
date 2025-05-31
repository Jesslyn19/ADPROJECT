import os
import re
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from ultralytics import YOLO
import easyocr
import cv2
import mysql.connector
from mysql.connector import Error

print("🐍 Script file loaded")

# --- Configuration ---
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
SERVICE_ACCOUNT_FILE = 'credentials.json'
FOLDER_ID = "19m4n3ifNDrQ0HTXNTURC2TEGP1GTYBMg"  # Replace with your folder ID

# --- Database Setup ---
def create_db_connection():
    """Create and return a MySQL database connection."""
    try:
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='db_kutip'
        )
    except Error as e:
        print(f"❌ Database connection error: {e}")
        return None
    
# --- Google Drive Functions ---
def initialize_drive_service():
    """Initialize and return the Google Drive service."""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        return build('drive', 'v3', credentials=credentials)
    except Exception as e:
        print(f"❌ Google Drive initialization error: {e}")
        return None

# def download_new_image(drive_service):
#     """Download the newest image from Google Drive."""
#     try:
#         results = drive_service.files().list(
#             q=f"'{FOLDER_ID}' in parents and mimeType contains 'image/'",
#             orderBy="createdTime desc",
#             fields="files(id, name, createdTime)",
#             pageSize=1
#         ).execute()
        
#         if not results.get('files'):
#             return None
            
#         file = results['files'][0]
        
#         # Validate filename format
#         if not re.match(r"IMG_\d{8}_\d{6}\.png", file['name']):
#             print(f"⚠️ Skipping {file['name']} - Invalid filename format")
#             return None
        
#         # Create downloads directory if it doesn't exist
#         os.makedirs('downloads', exist_ok=True)
#         file_path = os.path.join('downloads', file['name'])
        
#         # Download the file
#         request = drive_service.files().get_media(fileId=file['id'])
#         with open(file_path, 'wb') as f:
#             downloader = MediaIoBaseDownload(f, request)
#             done = False
#             while not done:
#                 _, done = downloader.next_chunk()
        
#         return {
#             'id': file['id'],
#             'name': file['name'],
#             'path': file_path
#         }
#     except Exception as e:
#         print(f"❌ Download error: {e}")
#         return None

def get_all_unprocessed_images(drive_service, conn):
    """Get all images from Drive that haven't been processed yet."""
    try:
        # Get all image files in the folder
        results = drive_service.files().list(
            q=f"'{FOLDER_ID}' in parents and mimeType contains 'image/'",
            fields="files(id, name, createdTime)",
            pageSize=1000
        ).execute()

        all_files = results.get('files', [])

        # Filter for valid filenames
        valid_files = [
            f for f in all_files
            if re.search(r"(20\d{2}[-_]?\d{2}[-_]?\d{2})[ _-]?(?:\d{6})\.(png|jpg|jpeg)$", f['name'], re.IGNORECASE)
        ]

        # Get list of already processed filenames from DB
        cursor = conn.cursor()
        cursor.execute("SELECT i_file FROM tb_image")
        processed_files = set(row[0] for row in cursor.fetchall())
        cursor.close()

        # Only return unprocessed ones
        unprocessed = [f for f in valid_files if f['name'] not in processed_files]
        print(f"ℹ️ Found {len(unprocessed)} unprocessed images")
        return unprocessed

    except Exception as e:
        print(f"❌ Error retrieving unprocessed images: {e}")
        return []

# --- Image Processing Functions ---
def extract_datetime_from_filename(filename):
    """Extract datetime from IMG_YYYYMMDD_HHMMSS.png filename."""
    match = re.search(r"(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[ _-]?(\d{2})(\d{2})(\d{2})", filename)
    if match:
        year, month, day, hour, minute, second = map(int, match.groups())
        return datetime(year, month, day, hour, minute, second)
    return None

def detect_plate_number(image_path):
    """Detect license plate using YOLOv8 and EasyOCR."""
    try:
        # Load YOLO model
        model = YOLO("runs/detect/train/weights/best.pt")  # Replace with your model path
        
        # Detect plate
        results = model.predict(source=image_path, conf=0.5)
        if not results or len(results[0].boxes) == 0:
            return None
            
        # Extract plate region
        x1, y1, x2, y2 = map(int, results[0].boxes.xyxy[0].tolist())
        plate_img = cv2.imread(image_path)[y1:y2, x1:x2]
        
        # Read plate text
        reader = easyocr.Reader(['en'])
        ocr_result = reader.readtext(plate_img)
        
        # Clean and return plate number
        if ocr_result:
            return ocr_result[0][1].upper().replace(" ", "")
        return None
    except Exception as e:
        print(f"❌ Plate detection error: {e}")
        return None

# --- Database Operations ---
def save_image_data(conn, image_info, plate_number):
    """Save processed image data to the database."""
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Extract datetime from filename
        capture_datetime = extract_datetime_from_filename(image_info['name'])
        if not capture_datetime:
            print("❌ Could not extract datetime from filename")
            return False
        
        capture_date = capture_datetime.date()
        capture_time = capture_datetime.time()
        
        cursor.execute("SELECT sb_id FROM tb_smartbin WHERE sb_plate = %s", (plate_number,))
        sb_result = cursor.fetchone()
        sb_id = sb_result[0] if sb_result else None
        
        # Insert into database
        cursor.execute(
            "INSERT INTO tb_image (i_plate, i_url, i_date, i_time, i_file, sb_id) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                plate_number,
                f"https://drive.google.com/file/d/{image_info['id']}/view",
                capture_date,
                capture_time,
                image_info['name'],
                sb_id
            )
        )
        conn.commit()
        print(f"✅ Saved {image_info['name']} (Plate: {plate_number})")
        return True
    except Error as e:
        conn.rollback()
        print(f"❌ Database save error: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

# --- Main Workflow ---
def main():
    print("✅ Script started...")
    # Initialize services
    drive_service = initialize_drive_service()
    if not drive_service:
        return

    db_conn = create_db_connection()
    if not db_conn:
        return

    try:
        # Step 1: Get all unprocessed images from Drive
        image_files = get_all_unprocessed_images(drive_service, db_conn)
        if not image_files:
            print("ℹ️ No new images to process.")
            return

        for image_file in image_files:
            file_path = os.path.join('downloads', image_file['name'])
            
            # ✅ Define image_info early so it’s always available
            image_info = {
                'id': image_file['id'],
                'name': image_file['name'],
                'path': file_path
            }

        # Download if not already present
            if not os.path.exists(file_path):
                try:
                    request = drive_service.files().get_media(fileId=image_file['id'])
                    os.makedirs('downloads', exist_ok=True)
                    with open(file_path, 'wb') as f:
                        downloader = MediaIoBaseDownload(f, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                except Exception as e:
                    print(f"❌ Failed to download {image_file['name']}: {e}")
                    continue

            print(f"🔍 Processing {image_file['name']}")


            plate_number = detect_plate_number(file_path)
            if not plate_number:
                print("⚠️ No plate detected")
                plate_number = "UNKNOWN"  # Mark unknowns as valid

            print(f"🚗 Detected plate: {plate_number}")

            if not save_image_data(db_conn, image_info, plate_number):
                print("❌ Failed to save to database")

    finally:
        db_conn.close()
        print("🏁 Processing complete")


if __name__ == "__main__":
    main()
    

