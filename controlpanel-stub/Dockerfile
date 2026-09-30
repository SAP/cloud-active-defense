FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir flask==3.0.3
COPY app.py .
EXPOSE 8050
CMD ["python", "app.py"]
