import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, Eye, RefreshCw, Building2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useClinicContext } from '../hooks/useClinicContext';
import QRCodeGenerator from './QRCodeGenerator';

const QRCodeManagement = () => {
  const { clinicId, userRole } = useClinicContext();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchClinics();
  }, [clinicId, userRole]);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      
      // If user is not admin and has no clinicId, return empty array
      if (userRole !== 'admin' && !clinicId) {
        setClinics([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('clinics')
        .select('id, name, slug, phone, address, email, is_active')
        .eq('is_active', true);

      // If user is not admin, only show their clinic
      if (userRole !== 'admin') {
        query = query.eq('id', clinicId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err) {
      console.error('Error fetching clinics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSlug = async (clinic) => {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ slug: null }) // Trigger will regenerate
        .eq('id', clinic.id);

      if (error) throw error;
      
      // Refresh the list
      await fetchClinics();
    } catch (err) {
      console.error('Error regenerating slug:', err);
      alert('Failed to regenerate slug: ' + err.message);
    }
  };

  const downloadAllQRCodes = async () => {
    try {
      const zip = new JSZip();
      
      for (const clinic of clinics) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(`${window.location.origin}/walkin/${clinic.slug}`)}&format=png&margin=10`;
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        zip.file(`${clinic.slug}-qr-code.png`, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clinic-qr-codes.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading QR codes:', err);
      alert('Failed to download QR codes');
    }
  };

  const printAllQRCodes = () => {
    const printWindow = window.open('', '_blank');
    const qrCodesHtml = clinics.map(clinic => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/walkin/${clinic.slug}`)}&format=png&margin=10`;
      return `
        <div class="qr-page">
          <div class="qr-container">
            <div class="clinic-name">${clinic.name}</div>
            <div class="subtitle">Walk-In Patient Registration</div>
            <div class="qr-code">
              <img src="${qrUrl}" alt="QR Code for ${clinic.name}" />
            </div>
            <div class="url">${window.location.origin}/walkin/${clinic.slug}</div>
            <div class="instructions">
              <strong>Instructions:</strong><br>
              1. Scan this QR code with your phone camera<br>
              2. Fill out the registration form<br>
              3. Submit to join the walk-in queue
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Clinic QR Codes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .qr-page {
              page-break-after: always;
              padding: 40px;
              text-align: center;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-page:last-child {
              page-break-after: avoid;
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
            .qr-code img {
              max-width: 100%;
              height: auto;
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
              body { padding: 0; }
              .qr-page { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${qrCodesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">Loading QR codes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchClinics}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <QrCode className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">QR Code Management</h1>
              <p className="text-slate-600 mt-1">Generate and manage walk-in registration QR codes</p>
            </div>
          </div>
          {clinics.length > 1 && (
            <div className="flex space-x-2">
              <button
                onClick={downloadAllQRCodes}
                className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All
              </button>
              <button
                onClick={printAllQRCodes}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-slate-600" />
                <div>
                  <h3 className="text-lg font-medium text-slate-800">{clinic.name}</h3>
                  <p className="text-sm text-slate-500">/{clinic.slug}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <QRCodeGenerator
                clinicId={clinic.id}
                clinicName={clinic.name}
                clinicSlug={clinic.slug}
                size={200}
                showControls={false}
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedClinic(clinic);
                  setShowQRModal(true);
                }}
                className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`${window.location.origin}/walkin/${clinic.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Test
                </a>
                <button
                  onClick={() => regenerateSlug(clinic)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clinics.length === 0 && (
        <div className="text-center py-12">
          <QrCode className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No clinics found</p>
        </div>
      )}

      {/* QR Code Detail Modal */}
      {showQRModal && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">{selectedClinic.name} - QR Code</h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <QRCodeGenerator
                clinicId={selectedClinic.id}
                clinicName={selectedClinic.name}
                clinicSlug={selectedClinic.slug}
                size={400}
                showControls={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManagement;