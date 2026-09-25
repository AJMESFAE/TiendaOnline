// Infraestructura Azure de tienda.institutoalbayan.com
//
//   az group create -n rg-tienda-albayan -l westeurope
//   az deployment group create -g rg-tienda-albayan -f infra/main.bicep \
//     -p infra/main.parameters.json -p dbAdminPassword=... redsysSecretKey=... smtpPassword=...
//
// Crea: Container Registry, PostgreSQL Flexible Server, Storage (imágenes),
// App Service Plan Linux + Web App for Containers con identidad administrada.

@description('Prefijo corto para los nombres de recursos (minúsculas, sin guiones)')
param prefix string = 'albayantienda'
param location string = resourceGroup().location

@description('Plan de App Service. B1 basta para empezar; P0v3 para más tráfico.')
param appServiceSku string = 'B1'

@description('Dominio público de la tienda')
param customDomain string = 'tienda.institutoalbayan.com'

param dbAdminUser string = 'albayanadmin'
@secure()
param dbAdminPassword string

@description('Datos del TPV Virtual de Redsys (los facilita el banco)')
param redsysEnvironment string = 'test'
param redsysMerchantCode string = '999008881'
param redsysTerminal string = '1'
@secure()
param redsysSecretKey string

param smtpHost string = 'smtp.office365.com'
param smtpPort string = '587'
param smtpUser string = ''
@secure()
param smtpPassword string = ''
param mailFrom string = 'Instituto Al-Bayān <tienda@institutoalbayan.com>'

@description('Etiqueta de la imagen a desplegar')
param imageTag string = 'latest'

var suffix = uniqueString(resourceGroup().id)
var acrName = take('${prefix}acr${suffix}', 50)
var pgName = '${prefix}-pg-${suffix}'
var storageName = take('${prefix}st${suffix}', 24)
var planName = '${prefix}-plan'
var appName = '${prefix}-app-${suffix}'
var dbName = 'evershop'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: pgName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: { storageSizeGB: 32, autoGrow: 'Enabled' }
    backup: { backupRetentionDays: 14, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pg
  name: dbName
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

// Permite conexiones desde servicios de Azure (App Service). Para aislar más,
// sustituir por integración VNet + acceso privado.
resource pgFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true // las imágenes de producto se sirven públicamente
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'media'
  properties: { publicAccess: 'Blob' }
}

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: { name: appServiceSku }
  properties: { reserved: true }
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/tienda-albayan:${imageTag}'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/'
      appSettings: [
        { name: 'WEBSITES_PORT', value: '3000' }
        { name: 'WEBSITES_CONTAINER_START_TIME_LIMIT', value: '600' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'TRUST_PROXY_HOPS', value: '1' }
        { name: 'EVERSHOP_HOME_URL', value: 'https://${customDomain}' }
        { name: 'DB_HOST', value: pg.properties.fullyQualifiedDomainName }
        { name: 'DB_PORT', value: '5432' }
        { name: 'DB_NAME', value: dbName }
        { name: 'DB_USER', value: dbAdminUser }
        { name: 'DB_PASSWORD', value: dbAdminPassword }
        { name: 'DB_SSLMODE', value: 'require' }
        { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnection }
        { name: 'AZURE_STORAGE_CONTAINER_NAME', value: 'media' }
        { name: 'REDSYS_STATUS', value: '1' }
        { name: 'REDSYS_ENVIRONMENT', value: redsysEnvironment }
        { name: 'REDSYS_MERCHANT_CODE', value: redsysMerchantCode }
        { name: 'REDSYS_TERMINAL', value: redsysTerminal }
        { name: 'REDSYS_SECRET_KEY', value: redsysSecretKey }
        { name: 'REDSYS_CURRENCY', value: '978' }
        { name: 'REDSYS_MERCHANT_NAME', value: 'Instituto Al-Bayan' }
        { name: 'SMTP_HOST', value: smtpHost }
        { name: 'SMTP_PORT', value: smtpPort }
        { name: 'SMTP_USER', value: smtpUser }
        { name: 'SMTP_PASSWORD', value: smtpPassword }
        { name: 'MAIL_FROM', value: mailFrom }
      ]
    }
  }
}

// La Web App descarga la imagen del ACR con su identidad administrada (AcrPull).
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, app.id, 'acrpull')
  scope: acr
  properties: {
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
  }
}

output appName string = app.name
output appDefaultHostname string = app.properties.defaultHostName
output customDomainVerificationId string = app.properties.customDomainVerificationId
output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output postgresHost string = pg.properties.fullyQualifiedDomainName
