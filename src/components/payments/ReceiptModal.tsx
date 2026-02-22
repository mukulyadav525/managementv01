import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button } from '@/components/common';
import { Payment, Flat, Building, Society } from '@/types';
import { format } from 'date-fns';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/config/supabase';
import { toCamel } from '@/services/supabase.service';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment;
    flat?: Flat;
    building?: Building;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    isOpen,
    onClose,
    payment,
    flat,
    building
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [society, setSociety] = useState<Society | null>(null);

    useEffect(() => {
        const fetchSociety = async () => {
            if (!payment.societyId) return;
            const { data } = await supabase
                .from('societies')
                .select('*')
                .eq('id', payment.societyId)
                .single();
            if (data) {
                setSociety(toCamel(data) as Society);
            }
        };
        if (isOpen) {
            fetchSociety();
        }
    }, [isOpen, payment.societyId]);

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Receipt_${payment.id.substring(0, 8)}_${format(new Date(), 'ddMMyy')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setDownloading(false);
        }
    };

    if (!society) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" size="lg">
            <div className="space-y-6">
                {/* Receipt Preview Container */}
                <div
                    ref={receiptRef}
                    className="bg-white p-8 border border-gray-100 shadow-sm rounded-lg"
                    style={{ minHeight: '600px' }}
                >
                    {/* Receipt Header */}
                    <div className="flex justify-between items-start border-b-2 border-primary-600 pb-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{society.name}</h2>
                            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                                <p>{society.address?.street || 'N/A'}, {society.address?.area || ''}</p>
                                <p>{society.address?.city || ''}, {society.address?.state || ''} - {society.address?.pincode || ''}</p>
                                <p>Email: {society.contactEmail}</p>
                                <p>Phone: {society.contactPhone}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-primary-50 px-4 py-2 rounded-lg mb-2">
                                <h1 className="text-primary-700 font-bold uppercase tracking-wider text-sm">Payment Receipt</h1>
                            </div>
                            <p className="text-xs text-gray-400">Receipt No: #{payment.id.substring(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-gray-400">Date: {format(new Date(payment.createdAt), 'MMM dd, yyyy')}</p>
                        </div>
                    </div>

                    {/* Receipt Body */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resident Details</h3>
                            <div className="text-sm text-gray-700">
                                <p className="font-bold text-base">{building?.name ? `${building.name} - ` : ''}{flat?.flatNumber || 'N/A'}</p>
                                <p className="mt-1">Transaction ID: {payment.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Status</h3>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium text-sm">
                                <CheckCircle2 size={14} />
                                {payment.status.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-10">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 text-left">
                                    <th className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="py-4">
                                        <p className="font-medium text-gray-900 capitalize">{payment.type} Payment</p>
                                        <p className="text-xs text-gray-500">For the period of {payment.month}</p>
                                    </td>
                                    <td className="py-4 text-right font-medium text-gray-900">₹{payment.amount.toLocaleString()}</td>
                                </tr>
                                {(payment.fineAmount || 0) > 0 && (
                                    <tr>
                                        <td className="py-4">
                                            <p className="font-medium text-gray-900">Late Payment Fine</p>
                                            <p className="text-xs text-gray-400 italic">{payment.fineReason || 'Penalty for overdue payment'}</p>
                                        </td>
                                        <td className="py-4 text-right font-medium text-gray-900 text-red-600">₹{payment.fineAmount?.toLocaleString()}</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-100">
                                    <td className="py-6 text-right">
                                        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Received</span>
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className="text-2xl font-bold text-primary-600">₹{(payment.amount + (payment.fineAmount || 0)).toLocaleString()}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer / Notes */}
                    <div className="border-t border-gray-100 pt-6 mt-auto">
                        <div className="flex justify-between items-end">
                            <div className="text-xs text-gray-400 italic max-w-xs">
                                <p>Note: This is a system-generated receipt and does not require a physical signature.</p>
                                <p className="mt-1">Payment Method: Online Transfer</p>
                            </div>
                            <div className="text-center">
                                <FileText size={40} className="text-gray-100 mb-2 mx-auto" />
                                <p className="text-[10px] text-gray-300 uppercase font-bold tracking-[0.2em]">{society.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end no-print">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        onClick={handleDownloadPDF}
                        loading={downloading}
                        className="shadow-lg shadow-primary-200"
                    >
                        <Download size={18} className="mr-2" />
                        Download PDF
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
