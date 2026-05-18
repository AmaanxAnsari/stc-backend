import wkhtmltopdf from 'wkhtmltopdf';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import SpotOrder from '../../models/admin/SpotOrderModel.js';
import { User } from '../../models/app/user.js';
import CompanyConfig from '../../models/admin/CompanyConfigModel.js';
import DeliveryVehicle from '../../models/admin/deliveryVehicleModel.js';
import DeliveryRoute from '../../models/admin/deliveryRouteModel.js';

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const source = addr.raw || addr;
  const parts = [
    source.houseNo,
    source.addressLine || source.buildingName,
    source.landmark,
    source.area,
    source.city,
    source.pincode,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return addr.fullAddress || addr.formatted || '';
};

const extractPaymentInfo = (order, orderType) => {
  if (orderType === 'replacement') return null;
  let payment = {
    method: order.paymentMethod || 'Cash',
    status: order.paymentStatus || 'Pending',
    transactionId: '-',
    date: '-',
  };
  if (orderType === 'on_spot' && order.paymentDetails) {
    const pd = order.paymentDetails;
    payment.method = pd.method || pd.paymentDetails?.method || 'Cash';
    payment.status = pd.status || 'Paid';
    if (pd.paymentDetails) {
      payment.transactionId =
        pd.paymentDetails.razorpayPaymentId || pd.transactionId || '-';
      payment.date = new Date(
        pd.paymentDetails.paidAt || pd.paidAt,
      ).toLocaleDateString();
    } else {
      payment.transactionId = pd.transactionId || '-';
      payment.date = new Date(pd.paidAt).toLocaleDateString();
    }
  } else if (order.paymentDetails) {
    const pd = order.paymentDetails;
    payment.method = pd.paymentMethod || order.paymentMethod || 'Online';
    payment.status = order.paymentStatus || 'Completed';
    payment.transactionId = pd.razorpayPaymentId || '-';
    payment.date = new Date(pd.paidAt).toLocaleDateString();
  } else {
    payment.method = order.paymentMethod || 'Cash';
    payment.status = order.paymentStatus || 'Pending';
  }
  return payment;
};
const getDeliveryDetails = async (order, orderType) => {
  let deliveryInfo = {
    officerName: '',
    officerPhone: '',
    vehicleName: '',
    vehicleNumber: '',
    deliveryDate: '',
  };

  try {
    // 1. FOR SPOT ORDERS (Directly in order object)
    if (orderType === 'on_spot') {
      // Fetch Driver
      if (order.driverId) {
        const driver = await User.findById(order.driverId).select(
          'fullName mobile',
        );
        if (driver) {
          deliveryInfo.officerName = driver.fullName;
          deliveryInfo.officerPhone = driver.mobile;
        }
      }
      // Fetch Vehicle
      if (order.vehicleId) {
        const vehicle = await DeliveryVehicle.findById(order.vehicleId).select(
          'vehicleName vehicleNumber',
        );
        if (vehicle) {
          deliveryInfo.vehicleName = vehicle.vehicleName;
          deliveryInfo.vehicleNumber = vehicle.vehicleNumber;
        }
      }
      // Date
      deliveryInfo.deliveryDate = order.deliveredDate
        ? new Date(order.deliveredDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '';
    }

    // 2. FOR ROUTE-BASED ORDERS (Normal, Bulk, Replacement)
    else {
      // Check if routeId exists
      if (order.routeId) {
        const route = await DeliveryRoute.findById(order.routeId);

        if (route) {
          // Fetch Delivery Officer from Route
          if (route.deliveryOfficer) {
            const officer = await User.findById(route.deliveryOfficer).select(
              'fullName mobile',
            );
            if (officer) {
              deliveryInfo.officerName = officer.fullName;
              deliveryInfo.officerPhone = officer.mobile;
            }
          }

          // Fetch Vehicle from Route
          if (route.deliveryVehicle) {
            const vehicle = await DeliveryVehicle.findById(
              route.deliveryVehicle,
            ).select('vehicleName vehicleNumber');
            if (vehicle) {
              deliveryInfo.vehicleName = vehicle.vehicleName;
              deliveryInfo.vehicleNumber = vehicle.vehicleNumber;
            }
          }
          // Use Next Delivery Date from Route if available, or order's delivery date
          if (route.nextDeliveryDate) {
            deliveryInfo.deliveryDate = new Date(
              route.nextDeliveryDate,
            ).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          }
        }
      }

      // Fallback: If no route info, try to get from order.deliveryProof (if delivered)
      if (!deliveryInfo.deliveryDate && order.deliveryProof?.deliveredDate) {
        deliveryInfo.deliveryDate = new Date(
          order.deliveryProof.deliveredDate,
        ).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    }
  } catch (error) {
    console.error('Error fetching delivery details:', error);
  }

  return deliveryInfo;
};


const fetchOrderDetails = async (orderId, orderType) => {
  let order = null;
  let mainorder = null;
  switch (orderType) {
    case 'normal':
      order = await AppOrder.findById(orderId).lean();
      break;
    case 'bulk':
      order = await BulkOrder.findById(orderId).lean();
      break;
    case 'replacement':
      order = await ReplacementRequest.findById(orderId).lean();
      mainorder = await AppOrder.findById(order?.orderId).select( "companyName isGst -_id").lean();
      break;
    case 'on_spot':
      order = await SpotOrder.findById(orderId).lean();
      break;
    default:
      return null;
  }
  if (!order) return null;
  console.log("Order",order)
  console.log('mainorder', mainorder);

  // ... (User Fallback logic remains same) ...
  let userFallback = {};
  if (order.createdBy) {
    const user = await User.findById(order.createdBy).select(
      'fullName mobile email addresses business_info',
    );
    if (user) {
      userFallback = {
        name: user.fullName,
        email: user.email,
        phone: user.mobile,
        address:
          user.addresses?.find((a) => a.isDefault)?.fullAddress ||
          user.business_info?.shopAddress ||
          '',
      };
    }
  }

  // === NEW: FETCH DELIVERY DETAILS ===
  const deliveryDetails = await getDeliveryDetails(order, orderType);

  const normalizedOrder = {
    // ... (Existing fields) ...
    displayId:
      order.requestId ||
      order.orderId ||
      order._id.toString().slice(-6).toUpperCase(),
    date: new Date(
      order.requestSubmittedAt || order.orderPlacedDate || order.createdAt,
    ).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    amount:
      orderType === 'replacement'
        ? 0
        : parseFloat(
            (order.billSummary && order.billSummary.totalAmount) ||
              order.totalAmount ||
              0,
          ).toFixed(2),

    // ... (User object remains same) ...
    user: {
      name:
        order.deliveryAddress?.raw?.name ||
        order.deliveryAddress?.receiverDetails?.split(' ')[0] ||
        order.customerDetails?.name ||
        order.customerInfo?.name ||
        userFallback.name ||
        'Guest',
      email:
        order.customerInfo?.email ||
        order.paymentDetails?.email ||
        userFallback.email ||
        '',
      phone:
        order.deliveryAddress?.raw?.phone ||
        order.customerDetails?.phone ||
        order.customerInfo?.phone ||
        userFallback.phone ||
        '',
      address:
        formatAddress(order.deliveryAddress) ||
        order.customerDetails?.address ||
        userFallback.address ||
        '',
    },

    // === ADDED DELIVERY INFO ===
    deliveryInfo: deliveryDetails,

    payment: extractPaymentInfo(order, orderType),
    items: [],
  };

  // ... (Items mapping logic remains same) ...
  if (orderType === 'replacement') {
    // ... replacement items logic ...
    if (order.replacementItems && order.replacementItems.length > 0) {
      normalizedOrder.items = order.replacementItems.map((item) => {
        const original = item.originalItem || {};
        const details = [];
        if (original.quantity) details.push(`Pack: ${original.quantity}`);
        if (item.reason) details.push(`Reason: ${item.reason}`);
        if (item.reasonDescription) details.push(`(${item.reasonDescription})`);
        return {
          name: original.name || 'Replacement Item',
          desc: details.join(' | '),
          rate: 0,
          qty: item.replacementQuantity || 1,
          total: 0,
        };
      });
    } else {
      normalizedOrder.items = [
        {
          name: 'Replacement Order',
          desc: order.notes || 'Replacement request processed',
          rate: 0,
          qty: 1,
          total: 0,
        },
      ];
    }
  } else {
    // ... products logic ...
    const products = order.products || [];
    if (products.length > 0) {
      normalizedOrder.items = products.map((p) => ({
        name: p.name || 'Product',
        desc: p.quantity ? `Pack: ${p.quantity}` : '',
        rate: p.price || 0,
        qty: p.orderQuantity || p.qty || 1,
        total: (p.price || 0) * (p.orderQuantity || p.qty || 1),
      }));
    } else {
      normalizedOrder.items = [
        {
          name: `${orderType.charAt(0).toUpperCase() + orderType.slice(1)} Order`,
          desc: order.specialInstructions || 'Order processed',
          rate: normalizedOrder.amount,
          qty: 1,
          total: normalizedOrder.amount,
        },
      ];
    }
  }
  return normalizedOrder;
};

function numberToWords(num) {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertBelowThousand(n) {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += n < 10 ? ones[n] : teens[n - 10];
    }
    return result.trim();
  }

  if (num === 0) return 'Zero';

  let crore = Math.floor(num / 10000000);
  let lakh = Math.floor((num % 10000000) / 100000);
  let thousand = Math.floor((num % 100000) / 1000);
  let remainder = num % 1000;

  let parts = [];
  if (crore > 0) parts.push(convertBelowThousand(crore) + ' Crore');
  if (lakh > 0) parts.push(convertBelowThousand(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertBelowThousand(thousand) + ' Thousand');
  if (remainder > 0) parts.push(convertBelowThousand(remainder));

  return parts.join(' ').trim();
}

export const generateInvoice = async (req, res) => {
  try {
    const { orderId, orderType, isGst } = req.body;
    const order = await fetchOrderDetails(orderId, orderType);
    console.log('Order', order);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }
    // console.log("Order",order)

    const protocol = req.protocol;
    const host = req.get('host');
    const dynamicBaseUrl = `${protocol}://${host}/api/v1/uploads`;

    const globalConfig = await CompanyConfig.findOne({ isDeleted: false });

    const useGstInvoice = isGst === true;

    const resolveLogo = (dbLogo, defaultLogo) => {
      if (!dbLogo) return defaultLogo;
      if (dbLogo.startsWith('http')) return dbLogo;
      return `${dynamicBaseUrl}/${dbLogo}`;
    };

    const defaults = {
      c1: {
        name: 'Gavran Pvt Ltd',
        address: '123 Gavran Tech Park, Mumbai, MH',
        contact: '+91-9876543210',
        email: 'support@gavran.com',
        gstin: '27AABCU9603R1ZN',
        gstPercentage: 18,
        logo: 'https://i.ibb.co/qFmyTGpN/icon.png',
        color: '#2563eb',
        bankName: 'HDFC Bank',
        accountNumber: '1234567890123456',
        ifscCode: 'HDFC0000123',
      },
      c2: {
        name: 'Samay Pvt Ltd',
        address: '456 Samay Logistics Hub, Pune, MH',
        contact: '+91-9876543211',
        email: 'support@samay.com',
        gstin: null,
        gstPercentage: 0,
        logo: 'https://i.ibb.co/7dYb3GtS/samay.png',
        color: '#16a34a',
        bankName: 'Axis Bank',
        accountNumber: '9876543210123456',
        ifscCode: 'AXIS0001234',
      },
    };

    const companyConfig = useGstInvoice
      ? {
          name: globalConfig?.companyOne?.name || defaults.c1.name,
          address: globalConfig?.companyOne?.address || defaults.c1.address,
          contact: globalConfig?.companyOne?.contact || defaults.c1.contact,
          email: globalConfig?.companyOne?.email || defaults.c1.email,
          panNo: globalConfig?.companyOne?.panNo || 'AAALCA 0462 A',
          gstin: globalConfig?.companyOne?.gstin || defaults.c1.gstin,
          gstPercentage:
            globalConfig?.companyOne?.gstPercentage ||
            defaults.c1.gstPercentage,
          logo: resolveLogo(globalConfig?.companyOne?.logo, defaults.c1.logo),
          color: globalConfig?.companyOne?.color || defaults.c1.color,
          bankName: globalConfig?.companyOne?.bankName || defaults.c1.bankName,
          accountNumber:
            globalConfig?.companyOne?.accountNumber ||
            defaults.c1.accountNumber,
          ifscCode: globalConfig?.companyOne?.ifscCode || defaults.c1.ifscCode,
        }
      : {
          name: globalConfig?.companyTwo?.name || defaults.c2.name,
          address: globalConfig?.companyTwo?.address || defaults.c2.address,
          contact: globalConfig?.companyTwo?.contact || defaults.c2.contact,
          email: globalConfig?.companyTwo?.email || defaults.c2.email,
          panNo: globalConfig?.companyTwo?.panNo || 'AAALCA0462B',
          gstPercentage:
            globalConfig?.companyTwo?.gstPercentage ||
            defaults.c2.gstPercentage,
          logo: resolveLogo(globalConfig?.companyTwo?.logo, defaults.c2.logo),
          color: globalConfig?.companyTwo?.color || defaults.c2.color,
          bankName: globalConfig?.companyTwo?.bankName || defaults.c2.bankName,
          accountNumber:
            globalConfig?.companyTwo?.accountNumber ||
            defaults.c2.accountNumber,
          ifscCode: globalConfig?.companyTwo?.ifscCode || defaults.c2.ifscCode,
        };

    const isReplacement =
      orderType === 'replacement' || order.orderType === 'replacement';
    const isSpotOrder =
      orderType === 'on_spot' || order.orderType === 'on_spot';

    const itemTotal =
      order.billSummary?.itemTotal ||
      parseFloat(order.items.reduce((sum, item) => sum + item.total, 0));
    const couponDiscountAmount = order.billSummary?.discount || 0;

    let deliveryFee = 0;
    let handlingFee = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    const gstPercentage = companyConfig.gstPercentage || 0;
    const halfGstPercentage = gstPercentage / 2;

    if (isReplacement) {
      deliveryFee = 0;
      handlingFee = 0;
      cgstAmount = 0;
      sgstAmount = 0;
    } else if (isSpotOrder) {
      deliveryFee = 0;
      handlingFee = 0;
      const taxableValue = Math.max(0, itemTotal - couponDiscountAmount);
      if (useGstInvoice && taxableValue > 0) {
        const halfTax = (taxableValue * halfGstPercentage) / 100;
        cgstAmount = Number(halfTax.toFixed(2));
        sgstAmount = Number(halfTax.toFixed(2));
      }
    } else {
      deliveryFee =
        order.billSummary?.deliveryFee || globalConfig?.deliveryFee || 0;
      handlingFee =
        order.billSummary?.handlingFee || globalConfig?.handlingFee || 0;
      const taxableValue = Math.max(0, itemTotal - couponDiscountAmount);
      if (useGstInvoice && taxableValue > 0) {
        const halfTax = (taxableValue * halfGstPercentage) / 100;
        cgstAmount = Number(halfTax.toFixed(2));
        sgstAmount = Number(halfTax.toFixed(2));
      }
    }

    const finalItemTotal = itemTotal - couponDiscountAmount;
    const totalTax = cgstAmount + sgstAmount;
    const rawTotal = finalItemTotal + deliveryFee + handlingFee + totalTax;
    const grandTotal = Math.ceil(Number(rawTotal));
    const amountInWords = numberToWords(Math.round(grandTotal));

    // ============================================================
    // FIXED HEIGHT LOGIC: Calculate rows needed to fill space
    // ============================================================
    const minRows = 12; // Change this number to increase/decrease table height
    const itemsCount = order.items.length;
    const emptyRowsCount = Math.max(0, minRows - itemsCount);

    let itemsTableRows = '';

    // 1. Render Actual Data Rows
    order.items.forEach((item, idx) => {
      itemsTableRows += `
        <tr style="height: 30px;">
          <td style="border-right: 1px solid #000; padding: 4px; text-align: center; width: 5%; border-bottom: none;">${
            idx + 1
          }</td>
          <td style="border-right: 1px solid #000; padding: 4px; width: 50%; border-bottom: none;">
            <strong>${item.name}</strong>
          </td>
          <td style="border-right: 1px solid #000; padding: 4px; text-align: right; width: 15%; border-bottom: none;">₹${parseFloat(
            item.rate,
          ).toFixed(2)}</td>
          <td style="border-right: 1px solid #000; padding: 4px; text-align: center; width: 10%; border-bottom: none;">${
            item.qty
          }</td>
          <td style="border-right: 1px solid #000; padding: 4px; text-align: right; width: 20%; border-bottom: none;">₹${parseFloat(
            item.total,
          ).toFixed(2)}</td>
        </tr>
      `;
    });

    // 2. Render Empty Rows (to force table height)
    for (let i = 0; i < emptyRowsCount; i++) {
      itemsTableRows += `
        <tr style="height: 30px;">
          <td style="border-right: 1px solid #000; border-bottom: none;"></td>
          <td style="border-right: 1px solid #000; border-bottom: none;"></td>
          <td style="border-right: 1px solid #000; border-bottom: none;"></td>
          <td style="border-right: 1px solid #000; border-bottom: none;"></td>
          <td style="border-right: 1px solid #000; border-bottom: none;"></td>
        </tr>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Tax Sales Invoice</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            padding: 15px;
          }
          table { border-collapse: collapse; width: 100%; }
          .container { max-width: 850px; margin: 0 auto; }
          .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 10px; }
          .header-table { width: 100%; margin-bottom: 15px; border: 1px solid #000; }
          .header-table td { padding: 8px; border: 1px solid #000; }
          .company-header { font-weight: bold; text-decoration: underline; }
          .invoice-info { text-align: center; }
          .invoice-info-table { width: 100%; margin-bottom: 15px; }
          .invoice-info-table td { border: 1px solid #000; padding: 4px; text-align: left; }
          .info-section-table { width: 100%; margin-bottom: 15px; }
          .info-section-table td { border: 1px solid #000; padding: 4px; }
          
          /* Updated Items Table Style */
          .items-table { width: 100%; margin-bottom: 0; border: 1px solid #000; }
          .items-table th { border: 1px solid #000; padding: 4px; text-align: center; background-color: #f5f5f5; font-weight: bold; }
          .items-table td { vertical-align: top; } 

          .total-row { text-align: right; padding: 4px; font-weight: bold; }
          .tax-table { width: 100%; margin-bottom: 15px; }
          .tax-table td { border: 1px solid #000; padding: 4px; text-align: center; }
          .tax-table th { border: 1px solid #000; padding: 4px; text-align: center; background-color: #f5f5f5; font-weight: bold; }
          .declaration-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
          .signature-section { text-align: right; margin-top: 30px; }
          .signature-line { border-top: 1px solid #000; width: 200px; margin: 30px 0 5px 0; margin-left: auto; }
          .footer-text { text-align: center; margin-top: 20px; font-size: 10px; }
          .bank-details-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .bank-details-table td { border: none; padding: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-title">TAX SALES</div>

          <table class="header-table" style="width: 100%; margin-bottom: 15px;">
            <tr>
              <td style="width: 60%; border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div class="company-header">${companyConfig.name}</div>
                <div style="font-size: 10px; line-height: 1.3; margin-top: 3px;">Address: ${
                  companyConfig.address
                }</div>
                ${
                  companyConfig.gstin
                    ? `<div style="font-size: 10px; margin-top: 3px;">GSTIN: ${companyConfig.gstin}</div>`
                    : ''
                }
                <div style="font-size: 10px; margin-top: 3px;">Email : ${
                  companyConfig.email
                }</div>
                <div style="font-size: 10px; margin-top: 3px;">Contact : ${
                  companyConfig.contact
                }</div>
              </td>
              <td style="width: 40%; border: 1px solid #000; padding: 8px; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Invoice No.</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.displayId}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Dated</td>
                    <td style="border: 1px solid #000; padding: 3px;">${
                      order.date
                    }</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Payment Method: </td>
                    <td style="border: 1px solid #000; padding: 3px;">${order?.payment?.method.toUpperCase() || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Payment Status: </td>
                    <td style="border: 1px solid #000; padding: 3px;">${order?.payment?.status.toUpperCase() || 'N/A'}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="info-section-table" style="width: 100%; margin-bottom: 15px;">
            <tr>
              <td style="width: 60%; border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Consignee (Ship to)</div>
                <div style="font-size: 10px;">
                  <strong>Name: ${order.user.name}</strong><br>
                  Address: ${order.user.address || ''}<br>
                  Email: ${order.user.email || ''}<br>
                  Phone: ${order.user.phone || ''}
                </div>
              </td>
              <td style="width: 40%; border: 1px solid #000; padding: 8px; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Delivery Officer</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.deliveryInfo.officerName || ''}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Phone No.</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.deliveryInfo.officerPhone || ''}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Delivery Vehicle Name</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.deliveryInfo.vehicleName || ''}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Delivery Vehicle No.</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.deliveryInfo.vehicleNumber || ''}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">Delivery Date</td>
                    <td style="border: 1px solid #000; padding: 3px;">${order.deliveryInfo.deliveryDate || ''}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- ITEMS TABLE START -->
          <table class="items-table" style="border-bottom: 1px solid #000;">
            <thead>
              <tr>
                <th style="width: 5%;">Sl. No.</th>
                <th style="width: 50%;">Description of Goods</th>
                <th style="width: 15%;">Rate</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 20%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
              <!-- Total Row with Top Border to close table -->
              <tr style="border-top: 1px solid #000;">
                <td colspan="4" style="border-right: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Total</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(
                  2,
                )}</td>
              </tr>
            </tbody>
          </table>
          <!-- ITEMS TABLE END -->

          <!-- <div style="margin-top: 15px; margin-bottom: 15px;">
            <div style="margin-bottom: 8px;">
              <strong>Amount Chargeable (in words)</strong>
            </div>
            <div style="font-weight: bold;">Indian Rupees ${amountInWords} Only</div>
          </div> -->

          <table style="width: 100%; margin-top: 15px; margin-bottom: 15px; border: 1px solid #000;">
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold; width: 60%;">Item Total</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${itemTotal.toFixed(
                2,
              )}</td>
            </tr>
            ${
              couponDiscountAmount > 0
                ? `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">Discount</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${couponDiscountAmount.toFixed(
                2,
              )}</td>
            </tr>
            `
                : ''
            }
            ${
              !isReplacement
                ? `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">Delivery Fee</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${deliveryFee.toFixed(
                2,
              )}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">Handling Fee</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${handlingFee.toFixed(
                2,
              )}</td>
            </tr>
            `
                : ''
            }
            ${
              useGstInvoice && !isReplacement
                ? `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">CGST (${halfGstPercentage}%)</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${cgstAmount.toFixed(
                2,
              )}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">SGST (${halfGstPercentage}%)</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">₹${sgstAmount.toFixed(
                2,
              )}</td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold; font-size: 12px;">Grand Total</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; font-size: 12px;">₹${grandTotal.toFixed(
                2,
              )}</td>
            </tr>
          </table>

          <div style="margin-bottom: 15px;">
            <strong>Chargable Amount (in words) :</strong> Indian Rupees ${amountInWords} Only
          </div>

          <div class="declaration-box">
            <div style="font-weight: bold; margin-bottom: 5px;">Company's PAN &nbsp;&nbsp;&nbsp;&nbsp;: ${
              companyConfig.panNo
            }</div>
            <div style="font-weight: bold; margin-bottom: 5px;">Declaration</div>
            <div style="font-size: 10px; line-height: 1.4;">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
            <div style="text-align: right; margin-top: 8px; font-weight: bold;">for ${
              companyConfig.name
            } - 2026-27</div>
          </div>
          
          <div class="bank-details-box">
            <div style="font-weight: bold; margin-bottom: 8px; text-decoration: underline;">Bank Details for Payment</div>
            <table class="bank-details-table" style="width: 100%;">
              <tr>
                <td style="font-weight: bold; width: 30%;">Bank Name:</td>
                <td>${companyConfig.bankName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Account No:</td>
                <td>${companyConfig.accountNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">IFSC Code:</td>
                <td>${companyConfig.ifscCode || 'N/A'}</td>
              </tr>
            </table>
          </div>

       <div class="signature-section" style="text-align: right; margin-top: 30px;">
  <!-- Company Logo as Signature -->
  <div style="margin-bottom: 5px;">
${companyConfig.name} 
  </div>
  <!-- Signature Line -->
  <div class="signature-line"></div>
  <div>Authorised Signature</div>
</div>


          <div class="footer-text">This is a Computer Generated Invoice</div>
        </div>
      </body>
      </html>
    `;

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${order.displayId}.pdf`,
    });

    wkhtmltopdf(htmlContent, {
      pageSize: 'A4',
      orientation: 'Portrait',
      marginTop: '0mm',
      marginBottom: '0mm',
      marginLeft: '0mm',
      marginRight: '0mm',
      printMediaType: true,
    }).pipe(res);
  } catch (error) {
    console.error('Error generating invoice:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate invoice',
        error: error.message,
      });
    }
  }
};
