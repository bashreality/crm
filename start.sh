#!/bin/bash

echo "🚀 CRM System - Quick Start"
echo "=============================="
echo ""

# Sprawdź czy Docker jest zainstalowany
if ! command -v docker &> /dev/null; then
    echo "❌ Docker nie jest zainstalowany!"
    echo "Pobierz Docker z: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Sprawdź czy Docker Compose jest zainstalowany
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose nie jest zainstalowany!"
    exit 1
fi

echo "✅ Docker i Docker Compose są zainstalowane"
echo ""

# Zatrzymaj stare kontenery jeśli istnieją
echo "🧹 Czyszczenie starych kontenerów..."
docker compose down 2>/dev/null

echo ""
echo "🏗️  Budowanie i uruchamianie aplikacji..."
echo "To może potrwać 5-10 minut przy pierwszym uruchomieniu..."
echo ""

docker compose up --build -d

echo ""
echo "⏳ Czekam na uruchomienie serwisów..."
sleep 10

echo ""
echo "✅ Aplikacja uruchomiona!"
echo ""
echo "📍 Dostępne URL:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8080/api"
echo "   PostgreSQL: localhost:5432"
echo ""
echo "📊 Aby zobaczyć logi:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Aby zatrzymać aplikację:"
echo "   docker-compose down"
echo ""
echo "🗑️  Aby usunąć wszystkie dane (baza danych):"
echo "   docker-compose down -v"
echo ""
