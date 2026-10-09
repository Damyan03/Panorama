# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["unnamed-site-backend.csproj", "."]
RUN dotnet restore

COPY . .
RUN dotnet build "unnamed-site-backend.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "unnamed-site-backend.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=publish /app/publish .

# Create uploads directory for image storage
RUN mkdir -p /app/uploads/images && chmod 755 /app/uploads

EXPOSE 5252 7069
ENV ASPNETCORE_URLS=http://+:5252

ENTRYPOINT ["dotnet", "unnamed-site-backend.dll"]
