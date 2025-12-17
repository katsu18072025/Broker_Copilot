import PDFDocument from 'pdfkit';

/**
 * Generate a PDF document from an AI brief
 * @param {Object} brief - The AI-generated brief data
 * @param {Object} item - The renewal item data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateBriefPDF(brief, item) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `${item.clientName || 'Renewal'} - AI Brief`,
                    Author: 'Broker Copilot',
                    Subject: 'Insurance Renewal Brief',
                    CreationDate: new Date()
                }
            });

            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // ========== HEADER ==========
            doc.fontSize(22)
                .fillColor('#2c3e50')
                .text('AI-Generated Renewal Brief', { align: 'center' });

            doc.moveDown(0.3);
            doc.fontSize(10)
                .fillColor('#7f8c8d')
                .text(`Generated on ${new Date().toLocaleString('en-US', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                })}`, { align: 'center' });

            doc.moveDown(1);

            // ========== CLIENT INFORMATION ==========
            doc.fontSize(16)
                .fillColor('#2c3e50')
                .text('Client Information', { underline: true });

            doc.moveDown(0.5);

            const clientInfo = [
                { label: 'Client Name', value: item.clientName || 'N/A' },
                { label: 'Primary Contact', value: item.primaryContactName || item.primaryContact?.name || 'N/A' },
                { label: 'Contact Email', value: item.primaryContact?.email || 'N/A' },
                { label: 'Renewal Date', value: item.renewalDate || 'N/A' },
                { label: 'Premium', value: item.premium ? `$${item.premium.toLocaleString()}` : 'N/A' },
                { label: 'Policy Type', value: item.policyType || 'N/A' }
            ];

            doc.fontSize(11).fillColor('#34495e');
            clientInfo.forEach(({ label, value }) => {
                doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
                    .font('Helvetica').text(value);
            });

            doc.moveDown(1);

            // ========== PRIORITY SCORE ==========
            if (item.priorityScore !== undefined) {
                doc.fontSize(16)
                    .fillColor('#2c3e50')
                    .text('Priority Assessment', { underline: true });

                doc.moveDown(0.5);

                const score = item.priorityScore || 0;
                const scoreColor = score >= 70 ? '#e74c3c' : score >= 50 ? '#f39c12' : '#95a5a6';

                doc.fontSize(14)
                    .fillColor(scoreColor)
                    .text(`Priority Score: ${score}/100`, { bold: true });

                doc.moveDown(1);
            }

            // ========== KEY ACTIONS ==========
            if (brief.keyActions && brief.keyActions.length > 0) {
                doc.fontSize(16)
                    .fillColor('#2c3e50')
                    .text('Recommended Actions', { underline: true });

                doc.moveDown(0.5);

                doc.fontSize(11).fillColor('#34495e');
                brief.keyActions.forEach((action, index) => {
                    doc.font('Helvetica-Bold')
                        .text(`${index + 1}. `, { continued: true, indent: 0 })
                        .font('Helvetica')
                        .text(action, { indent: 20 });
                    doc.moveDown(0.3);
                });

                doc.moveDown(0.8);
            }

            // ========== OUTREACH TEMPLATE ==========
            if (brief.outreachTemplate) {
                doc.fontSize(16)
                    .fillColor('#2c3e50')
                    .text('Suggested Outreach Message', { underline: true });

                doc.moveDown(0.5);

                const template = typeof brief.outreachTemplate === 'string'
                    ? brief.outreachTemplate
                    : JSON.stringify(brief.outreachTemplate, null, 2);

                doc.fontSize(10)
                    .fillColor('#34495e')
                    .font('Courier')
                    .text(template, {
                        indent: 10,
                        width: doc.page.width - 100,
                        lineGap: 2
                    });

                doc.moveDown(0.8);
            }

            // ========== COMMUNICATION SUMMARY ==========
            if (item.communications) {
                doc.fontSize(16)
                    .fillColor('#2c3e50')
                    .font('Helvetica-Bold')
                    .text('Communication History', { underline: true });

                doc.moveDown(0.5);

                doc.fontSize(11).fillColor('#34495e').font('Helvetica');
                doc.text(`Total Touchpoints: ${item.communications.totalTouchpoints || 0}`);
                doc.text(`Last Contact: ${item.communications.lastContactDate || 'Never'}`);

                doc.moveDown(0.5);

                // Recent Emails
                if (item.communications.recentEmails && item.communications.recentEmails.length > 0) {
                    doc.fontSize(10).font('Helvetica-Bold').text('Recent Emails:');
                    doc.fontSize(9).font('Helvetica');
                    item.communications.recentEmails.slice(0, 3).forEach(e => {
                        doc.text(`• ${e.date}: ${e.subject}`, { indent: 10 });
                    });
                    doc.moveDown(0.3);
                }

                // Recent Meetings
                if (item.communications.recentMeetings && item.communications.recentMeetings.length > 0) {
                    doc.fontSize(10).font('Helvetica-Bold').text('Recent Meetings:');
                    doc.fontSize(9).font('Helvetica');
                    item.communications.recentMeetings.slice(0, 3).forEach(m => {
                        doc.text(`• ${m.date}: ${m.summary}`, { indent: 10 });
                    });
                }

                doc.moveDown(0.8);
            }

            // ========== FOOTER ==========
            // Add space before footer
            doc.moveDown(2);

            doc.fontSize(8)
                .fillColor('#95a5a6')
                .text('This document was automatically generated by Broker Copilot AI', { align: 'center' });

            doc.fontSize(7)
                .fillColor('#bdc3c7')
                .text('Please review all information for accuracy before taking action', { align: 'center' });

            // Finalize PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}
