# Use an official lightweight Python image.
FROM python:3.11-slim

# Set working directory in the container.
WORKDIR /app

# Install system dependencies if needed.
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install Python dependencies.
# Your requirements.txt should include:
#   fastapi>=0.78.0
#   uvicorn[standard]>=0.18.2
#   telethon>=1.27.0
#   python-dotenv>=1.0.0
#   requests>=2.28.1
#   beautifulsoup4>=4.11.1
#   aiohttp>=3.8.1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code.
COPY . .

# Expose port 3000 so that Fly’s proxy can route traffic here.
EXPOSE 3000

# Use a startup script to run the FastAPI server and your scanner modules concurrently.
CMD ["./start.sh"]

