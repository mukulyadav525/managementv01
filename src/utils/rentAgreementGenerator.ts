import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Society, User, Flat, Building, RentAgreement } from '../types';

interface GenerationData {
    society: Society;
    owner: User;
    tenant: User;
    flat: Flat;
    building?: Building;
    agreement: Partial<RentAgreement>;
}

export const generateRentAgreementPDF = (data: GenerationData): Blob => {
    const { society, owner, tenant, flat, building, agreement } = data;
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Helper to add centered text
    const centerText = (text: string, yPos: number, size = 12, style = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (210 - textWidth) / 2, yPos);
    };

    // Helper to add wrapped text
    const addWrappedText = (text: string, x: number, yPos: number, maxWidth: number) => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, yPos);
        return yPos + (lines.length * 7);
    };

    // Header
    centerText('RENT AGREEMENT', y, 22, 'bold');
    y += 15;

    // Date of Agreement
    const agreementDate = format(new Date(), 'do MMMM yyyy');
    centerText(`This Rent Agreement is made on this ${agreementDate}`, y, 10);
    y += 15;

    // Between Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BETWEEN:', margin, y);
    y += 10;

    // Landlord
    doc.setFont('helvetica', 'normal');
    let landlordText = `Mr./Ms. ${owner.name}, S/o D/o W/o ____________________, residing at ${society.name}, ${society.address.street}, ${society.address.city}, ${society.address.state} - ${society.address.pincode}, hereinafter referred to as the "LANDLORD" (which expression shall unless repugnant to the context or meaning thereof mean and include his/her heirs, executors, administrators and assigns) of the FIRST PART.`;
    y = addWrappedText(landlordText, margin, y, 170);
    y += 5;

    centerText('AND', y, 12, 'bold');
    y += 10;

    // Tenant
    doc.setFont('helvetica', 'normal');
    let tenantText = `Mr./Ms. ${tenant.name}, S/o D/o W/o ____________________, permanent resident of ______________________________________________________________________, hereinafter referred to as the "TENANT" (which expression shall unless repugnant to the context or meaning thereof mean and include his/her heirs, executors, administrators and assigns) of the SECOND PART.`;
    y = addWrappedText(tenantText, margin, y, 170);
    y += 15;

    // Property Description
    doc.setFont('helvetica', 'bold');
    doc.text('WHEREAS:', margin, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    let propertyDesc = `The Landlord is the absolute owner of the residential property Unit No. ${flat.flatNumber}${building ? `, ${building.name}` : ''} at ${society.name}, situated at ${society.address.street}, ${society.address.area}, ${society.address.city}, ${society.address.state} - ${society.address.pincode} (hereinafter referred to as the "DEMISED PREMISES").`;
    y = addWrappedText(propertyDesc, margin, y, 170);
    y += 15;

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.text('NOW THIS AGREEMENT WITNESSETH AS UNDER:', margin, y);
    y += 10;

    const terms = [
        `1. That the tenancy shall be for a period of 11 months starting from ${format(new Date(agreement.startDate!), 'dd/MM/yyyy')}${agreement.endDate ? ` to ${format(new Date(agreement.endDate), 'dd/MM/yyyy')}` : ''}.`,
        `2. That the Tenant shall pay a monthly rent of Rs. ${agreement.monthlyRent}/- (Rupees ${agreement.monthlyRent} only) in advance on or before the 7th of every month.`,
        `3. That the Tenant has paid a security deposit of Rs. ${agreement.securityDeposit}/- to the Landlord, which shall be refunded (interest-free) at the time of vacation of the premises after adjusting any dues or damages.`,
        `4. That the Demised Premises shall be used for residential purposes only by the Tenant and his/her family members.`,
        `5. That the electricity and water charges shall be paid by the Tenant extra as per the actual meter readings.`,
        `6. That the Tenant shall NOT make any structural changes or permanent additions/alterations to the premises without written permission.`,
        `7. That the Landlord or his/her authorized agent shall have the right to inspect the premises at reasonable times with prior notice.`,
        `8. That the notice period for vacating the premises shall be ${agreement.terms?.noticePeriod || 1} month(s) from either side.`
    ];

    doc.setFontSize(10);
    terms.forEach(term => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        y = addWrappedText(term, margin, y, 170);
        y += 3;
    });

    y += 20;
    if (y > 260) {
        doc.addPage();
        y = 30;
    }

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.text('LANDLORD', margin, y);
    doc.text('TENANT', 140, y);

    y += 20;
    doc.text('______________________', margin, y);
    doc.text('______________________', 140, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`(${owner.name})`, margin, y);
    doc.text(`(${tenant.name})`, 140, y);

    return doc.output('blob');
};
