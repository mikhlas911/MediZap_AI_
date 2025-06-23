import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

const QRCodeGenerator = ({ clinicId, clinicName, clinicSlug, size = 256, showControls = true }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const registrationUrl = `${window.location.origin}/walkin/${clinicSlug}`;

  useEffect(() => {
    generateQRCode();
  }, [clinicSlug, size]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      // Using QR Server API (free service)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(registrationUrl)}&format=png&margin=10`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadQRCode = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${clinicSlug}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${clinicName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              margin: 0;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 30px;
              background: white;
            }
            .clinic-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 30px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .url {
              font-size: 14px;
              color: #475569;
              word-break: break-all;
              margin-top: 20px;
              padding: 10px;
              background: #f8fafc;
              border-radius: 6px;
            }
            .instructions {
              font-size: 14px;
              color: #64748b;
              margin-top: 20px;
              line-height: 1.5;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="clinic-name">${clinicName}</div>
            <div class="subtitle">Walk-In Patient Registration</div>
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 100%; height: auto;" />
            </div>
            <div class="url">${registrationUrl}</div>
            <div class="instructions">
              <strong>Instructions:</strong><br>
              1. Scan this QR code with your phone camera<br>
              2. Fill out the registration form<br>
              3. Submit to join the walk-in queue
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Generating QR code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <QrCode className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-medium text-slate-800">Walk-In Registration QR Code</h3>
        </div>
        
        <div className="mb-4">
          <img 
            src={qrCodeUrl} 
            alt={`QR Code for ${clinicName}`}
            className="mx-auto border border-slate-200 rounded-lg"
            style={{ width: size, height: size }}
          />
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Registration URL:</p>
          <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-3">
            <code className="flex-1 text-sm text-slate-600 break-all">{registrationUrl}</code>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {showControls && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={downloadQRCode}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={printQRCode}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Form
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeGenerator;