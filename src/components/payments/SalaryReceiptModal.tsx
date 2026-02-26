import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button } from '@/components/common';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { SalaryPayment, Society, User as UserType } from '@/types';
import { supabase } from '@/config/supabase';
import { toCamel } from '@/services/supabase.service';

interface SalaryReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: SalaryPayment;
    employee: UserType;
}

export const SalaryReceiptModal: React.FC<SalaryReceiptModalProps> = ({
    isOpen,
    onClose,
    payment,
    employee
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
            pdf.save(`Salary_${employee.name.replace(/\s+/g, '_')}_${payment.month}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setDownloading(false);
        }
    };

    if (!society) return null;

    const formatMonthLong = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Salary Receipt" size="lg">
            <div className="space-y-6">
                <div
                    ref={receiptRef}
                    className="bg-white p-8 border border-gray-100 shadow-sm rounded-lg"
                    style={{ minHeight: '600px' }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{society.name}</h2>
                            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                                <p>{society.address?.street}, {society.address?.city}</p>
                                <p>{society.address?.state} - {society.address?.pincode}</p>
                                <p>Phone: {society.contactPhone}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-indigo-50 px-4 py-2 rounded-lg mb-2">
                                <h1 className="text-indigo-700 font-bold uppercase tracking-wider text-sm">Payslip / Receipt</h1>
                            </div>
                            <p className="text-xs text-gray-400">Month: {formatMonthLong(payment.month)}</p>
                            <p className="text-xs text-gray-400">Date: {payment.paidAt ? format(new Date(payment.paidAt), 'MMM dd, yyyy') : 'N/A'}</p>
                        </div>
                    </div>

                    {/* Employee Details */}
                    <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Employee Information</h3>
                            <div className="text-sm text-gray-700 space-y-1">
                                <p className="font-bold text-base text-gray-900">{employee.name}</p>
                                <p>Role: <span className="capitalize">{employee.role}</span></p>
                                <p>Email: {employee.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Details</h3>
                            <div className="text-sm text-gray-700 space-y-1">
                                <p>Transaction ID: <span className="font-mono text-xs">{payment.transactionId || payment.id.substring(0, 13)}</span></p>
                                <p>Method: <span className="capitalize">{payment.paymentMethod || 'Transfer'}</span></p>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium text-xs mt-2">
                                    <CheckCircle2 size={12} />
                                    PAID
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Earnings Table */}
                    <div className="mb-10">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 text-left">
                                    <th className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Earnings Description</th>
                                    <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="py-4">
                                        <p className="font-medium text-gray-900">Basic Salary</p>
                                        <p className="text-xs text-gray-500">For the month of {formatMonthLong(payment.month)}</p>
                                    </td>
                                    <td className="py-4 text-right font-medium text-gray-900">₹{payment.amount.toLocaleString()}</td>
                                </tr>
                                {payment.notes && (
                                    <tr>
                                        <td className="py-4">
                                            <p className="font-medium text-gray-900">Other Allowances / Notes</p>
                                            <p className="text-xs text-gray-400 italic">{payment.notes}</p>
                                        </td>
                                        <td className="py-4 text-right font-medium text-gray-900">₹0.00</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-100">
                                    <td className="py-6 text-right">
                                        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Net Salary Payable</span>
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className="text-2xl font-bold text-indigo-600">₹{payment.amount.toLocaleString()}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Signature / Note */}
                    <div className="border-t border-gray-100 pt-6 mt-auto">
                        <div className="flex justify-between items-end">
                            <div className="text-xs text-gray-400 italic max-w-xs">
                                <p>Note: This is an electronically generated payslip and does not require a physical signature.</p>
                                <p className="mt-1">Generated by {society.name} Prabandh</p>
                            </div>
                            <div className="text-center opacity-20">
                                <FileText size={48} className="text-gray-400 mb-1 mx-auto" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OFFICIAL RECEIPT</p>
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
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    >
                        <Download size={18} className="mr-2" />
                        Download Payslip
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
