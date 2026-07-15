import fs from 'fs';
import path from 'path';

import puppeteer from 'puppeteer';
import ejs from 'ejs';
import Enquiry from './../../models/admin/enquiryModel.js';
import Order from './../../models/admin/orderModel.js';



// export const generateQuotation = async (req, res) => {
//   try {
//     const { enquiryId, items, loading = 0 } = req.body;

//     const enquiry = await Enquiry.findById(enquiryId).populate('customer');

//     if (!enquiry) {
//       return res.status(404).json({
//         success: false,
//         message: 'Enquiry not found',
//       });
//     }

//     let subtotal = 0;

//     const updatedItems = enquiry.items.map((dbItem) => {
//       const frontendItem = items.find(
//         (i) => i.itemId === dbItem._id.toString(),
//       );

//       const weight = Number(frontendItem?.weight || 0);

//       const ratePerKg = Number(frontendItem?.ratePerKg || 0);

//       const amount = weight * ratePerKg;

//       subtotal += amount;

//       return {
//         ...dbItem.toObject(),
//         weight,
//         ratePerKg,
//         amount,
//       };
//     });

//     const gstAmount = ((subtotal + Number(loading)) * 18) / 100;

//     const totalAmount = subtotal + Number(loading) + gstAmount;

//     const quotationNo = `QT-${Date.now()}`;

//     // ================= HTML TEMPLATE =================

//     const templatePath = path.join(
//       process.cwd(),
//       'src/templates',
//       'quotationTemplate.ejs',
//     );

//     const html = await ejs.renderFile(templatePath, {
//       enquiry,
//       quotationNo,
//       items: updatedItems,
//       subtotal,
//       gstAmount,
//       loading,
//       totalAmount,
//       currentDate: new Date(),
//     });

//     // ================= PDF GENERATION =================

//     const browser = await puppeteer.launch({
//       headless: true,
//     });

//     const page = await browser.newPage();

//     await page.setContent(html, {
//       waitUntil: 'domcontentloaded',
//     });

//     if (!fs.existsSync('uploads/quotations')) {
//       fs.mkdirSync('uploads/quotations', {
//         recursive: true,
//       });
//     }

//     const fileName = `${quotationNo}.pdf`;

//     const pdfPath = path.join(process.cwd(), 'uploads', 'quotations', fileName);

//     await page.pdf({
//       path: pdfPath,
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '20px',
//         right: '20px',
//         bottom: '20px',
//         left: '20px',
//       },
//     });

//     await browser.close();

//     const pdfUrl = `/uploads/quotations/${fileName}`;

//     // ================= SAVE TO ENQUIRY =================

//     enquiry.quotation = {
//       quotationNo,
//       pdfUrl,
//       subtotal,
//       gstAmount,
//       loading,
//       totalAmount,
//       generatedAt: new Date(),
//     };

//     enquiry.status = 'quotation_generated';

//     // STORE RATE DATA INSIDE ITEMS
//     enquiry.items = updatedItems;

//     await enquiry.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Quotation generated successfully',
//       pdfUrl,
//       quotationNo,
//     });
//   } catch (error) {
//     console.log(error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const generateQuotation = async (req, res) => {
  try {
    const { enquiryId, items, loading = 600 } = req.body;

    const enquiry = await Enquiry.findById(enquiryId).populate('customer');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found',
      });
    }

    // ================= CALCULATIONS =================

    let subtotal = 0;

    const updatedItems = enquiry.items.map((dbItem) => {
      const frontendItem = items.find(
        (i) => i.itemId === dbItem._id.toString(),
      );

      const weight = Number(frontendItem?.weight || 0);

      const ratePerKg = Number(frontendItem?.ratePerKg || 0);

      const amount = weight * ratePerKg;

      subtotal += amount;

      return {
        ...dbItem.toObject(),
        weight,
        ratePerKg,
        amount,
      };
    });

    const gstAmount = ((subtotal + Number(loading)) * 18) / 100;

    const totalAmount = subtotal + Number(loading) + gstAmount;

    const quotationNo = `QT-${Date.now()}`;

    // ================= TEMPLATE =================

    const templatePath = path.join(
      process.cwd(),
      'src/templates',
      'quotationTemplate.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      enquiry,
      quotationNo,
      items: updatedItems,
      subtotal,
      gstAmount,
      loading,
      totalAmount,
      currentDate: new Date(),
    });

    // ================= PUPPETEER =================

    // ================= PUPPETEER CONFIG =================
    const browser = await puppeteer.launch({
      // Agar Docker environment me path set hai to wo uthayega, local normal chalaoge to default uthayega
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // ================= PDF BUFFER =================

    const pdfBuffer = await page.pdf({
      format: 'A4',

      printBackground: true,

      preferCSSPageSize: true,

      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    // ================= SAVE DATA =================

    enquiry.quotation = {
      quotationNo,
      subtotal,
      gstAmount,
      loading,
      totalAmount,
      generatedAt: new Date(),
    };

    enquiry.status = 'quotation_generated';

    enquiry.items = updatedItems;

    await enquiry.save();

    // ================= SEND PDF =================

    const buffer = Buffer.from(pdfBuffer);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',

      'Content-Length': buffer.length,

      'Content-Disposition': `inline; filename="${quotationNo}.pdf"`,

      'Cache-Control': 'no-store',
    });

    return res.end(buffer);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export const moveAllToInProcess = async (req, res) => {
  try {
    const { enquiryId } = req.body;

    const enquiry = await Enquiry.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found',
      });
    }

    // ================= CREATE ORDER =================

    const order = await Order.create({
      orderNo: `ORD-${Date.now()}`,

      // STORE CUSTOMER ID ONLY
      customer: enquiry.customer,

      poNumber: enquiry.poNumber,

      enquiryText: enquiry.enquiryText,

      quotation: enquiry.quotation,

      items: enquiry.items.map((item) => ({
        type: item.type,

        thickness: item.thickness,

        length: item.length,

        width: item.width,

        qty: item.qty,

        weight: item.weight || 0,

        ratePerKg: item.ratePerKg || 0,

        amount: item.amount || 0,

        programNo: item.programNo,

        partNo: item.partNo,

        status: 'in_process',

        auditLogs: [
          {
            action: 'Moved To In Process',

            performedBy: req.user.id,
          },
        ],
      })),

      status: 'in_process',

      createdBy: req.user.id,
    });

    // ================= DELETE ENQUIRY =================

    await Enquiry.findByIdAndDelete(enquiryId);

    return res.status(200).json({
      success: true,
      message: 'Order moved successfully',
      order,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
