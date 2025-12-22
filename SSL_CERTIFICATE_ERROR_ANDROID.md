# SSL Certificate Error on Android (NET::ERR_CERT_AUTHORITY_INVALID)

## Why This Happens

If Android users are seeing the error `NET::ERR_CERT_AUTHORITY_INVALID` with a message mentioning "Fortigate", this is caused by **network-level SSL inspection**, not an issue with your website's certificate.

### What's Happening:

1. **Network SSL Inspection**: Some networks (corporate networks, public WiFi, schools, etc.) use security appliances like FortiGate to inspect HTTPS traffic for security purposes.

2. **Certificate Interception**: FortiGate intercepts HTTPS connections and presents its own certificate to the browser instead of your website's certificate.

3. **Certificate Trust Issue**: Android Chrome doesn't trust FortiGate's certificate because it's not from a recognized Certificate Authority (CA).

4. **Why Android Specifically**: Android devices may be more strict about certificate validation, or the network configuration may affect Android devices differently than desktop browsers.

## This Is NOT a Problem With Your Website

- ✅ Your website (`got1.app`) has a valid SSL certificate from a trusted CA (Vercel provides certificates from Let's Encrypt)
- ✅ The certificate is properly configured and works fine for most users
- ✅ This is a network/client-side issue, not a server-side issue

## What Users Can Do

### Option 1: Use a Different Network (Recommended)
- Switch to mobile data instead of WiFi
- Connect to a different WiFi network
- Use a VPN (if allowed by network policy)

### Option 2: Trust the Network Certificate (Corporate Networks)
If users are on a corporate/enterprise network:
1. They may need to install the FortiGate root certificate on their Android device
2. This is typically done by their IT department
3. Instructions vary by Android version and device manufacturer

### Option 3: Contact Network Administrator
For corporate/school networks:
- Ask IT to add `got1.app` to the SSL inspection bypass list
- Or request instructions for installing the FortiGate certificate

### Option 4: Use Chrome's Advanced Option (Not Recommended)
Users can click "Advanced" and proceed, but this:
- ⚠️ Reduces security protections
- ⚠️ Only works temporarily (error will reappear)
- ⚠️ Only advised if the user trusts the network

## What We've Done

1. ✅ Added HSTS (HTTP Strict Transport Security) headers to ensure secure connections
2. ✅ Added additional security headers for better certificate validation
3. ✅ Ensured the website uses a valid certificate from a trusted CA (via Vercel)

## Technical Details

Your website is hosted on Vercel, which automatically provides:
- SSL/TLS certificates from Let's Encrypt (trusted by all browsers)
- Proper certificate chain
- Automatic certificate renewal

The error occurs because FortiGate intercepts the connection **before** it reaches Vercel's servers, so your valid certificate never reaches the Android device.

## Summary

This is a known issue with network security appliances performing SSL inspection. It cannot be fixed from the website side - it requires either:
- The user to use a different network
- The network administrator to configure FortiGate properly
- The user to install the network's root certificate (for corporate networks)

Your website's SSL configuration is correct and working properly.
