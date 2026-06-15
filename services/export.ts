import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { ProductionLog } from './production';

export async function exportToExcel(logs: ProductionLog[]): Promise<void> {
  try {
    const headers = [
      'Date',
      'Worker',
      'Product',
      'SKU',
      'Gender',
      'EU Size',
      'Qty',
      'Leather (sqf)',
      'Leather Type',
      'Buckles',
      'Buckle Type',
      'Footbeds',
      'Footbed Type',
      'Footbed Size'
    ];
    const rows = logs.map((log) => [
      log.logDate,
      log.workerName,
      log.productName,
      log.sku,
      log.gender,
      `EU ${log.euSize}`,
      log.quantityPairs,
      (log.leatherDeductedSqf ?? 0).toFixed(2),
      log.leatherType,
      log.buckleDeducted,
      log.buckleType,
      log.footbedDeducted,
      log.footbedType,
      log.footbedGender ? `${log.footbedGender} EU ${log.footbedEuSize}` : 'None',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `production_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const filename = `production_report_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share Excel Report' });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
      }
    }
  } catch (error) {
    throw error;
  }
}

export async function exportToPDF(logs: ProductionLog[]): Promise<void> {
  try {
    const totalPairs = logs.reduce((sum, l) => sum + l.quantityPairs, 0);
    const totalLeather = logs.reduce((sum, l) => sum + (l.leatherDeductedSqf ?? 0), 0);
    const totalBuckles = logs.reduce((sum, l) => sum + l.buckleDeducted, 0);
    const totalFootbeds = logs.reduce((sum, l) => sum + l.footbedDeducted, 0);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; text-align: center; color: #8C6239; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; padding: 15px; background: #F7F5F0; border-radius: 8px; border: 1px solid #E6E1DA; }
            .summary-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #5C5854; }
            .summary-grid { display: flex; justify-content: space-between; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background-color: #8C6239; color: white; padding: 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #E6E1DA; }
            tr:nth-child(even) { background-color: #FDFDFB; }
          </style>
        </head>
        <body>
          <h1>Bregid Footwear - Production Report</h1>
          <div class="summary">
            <div class="summary-title">REPORT SUMMARY</div>
            <div class="summary-grid">
              <div><strong>Total Logs:</strong> ${logs.length}</div>
              <div><strong>Total Pairs:</strong> ${totalPairs}</div>
              <div><strong>Leather:</strong> ${totalLeather.toFixed(2)} sqf</div>
              <div><strong>Buckles:</strong> ${totalBuckles}</div>
              <div><strong>Footbeds:</strong> ${totalFootbeds}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Worker</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Leather</th>
                <th>Buckles</th>
                <th>Footbeds</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((log) => `
                <tr>
                  <td>${log.logDate}</td>
                  <td>${log.workerName}</td>
                  <td>${log.productName}</td>
                  <td>${log.sku}</td>
                  <td>EU ${log.euSize}</td>
                  <td>${log.quantityPairs}</td>
                  <td>${(log.leatherDeductedSqf ?? 0).toFixed(2)} sqf (${log.leatherType})</td>
                  <td>${log.buckleDeducted} (${log.buckleType})</td>
                  <td>${log.footbedDeducted > 0 ? `${log.footbedDeducted} (${log.footbedGender} ${log.footbedType} EU ${log.footbedEuSize})` : '0'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.setAttribute('download', `production_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF Report' });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
      }
    }
  } catch (error) {
    throw error;
  }
}

interface StockLogEntry {
  _id: string;
  type: string;
  material: string;
  materialType?: string;
  quantity: number;
  unit: string;
  reason: string;
  updatedByName: string;
  timestamp: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierContact?: string;
  footbedGender?: string;
  footbedEuSize?: number;
}

export async function exportStockLogsToExcel(logs: StockLogEntry[]): Promise<void> {
  try {
    const headers = [
      'Date',
      'Material',
      'Type',
      'Material Type',
      'Quantity',
      'Unit',
      'Supplier Name',
      'Invoice Number',
      'Invoice Date',
      'Supplier Contact',
      'Added By',
      'Footbed Size',
    ];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toLocaleDateString('en-GB'),
      log.material.charAt(0).toUpperCase() + log.material.slice(1),
      log.type === 'add' ? 'Add' : 'Deduct',
      log.materialType || '',
      log.quantity.toFixed(log.unit === 'sqf' ? 2 : 0),
      log.unit,
      log.supplierName || '',
      log.invoiceNumber || '',
      log.invoiceDate ? new Date(log.invoiceDate).toLocaleDateString('en-GB') : '',
      log.supplierContact || '',
      log.updatedByName,
      log.footbedGender ? `${log.footbedGender} EU ${log.footbedEuSize}` : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock_logs_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const filename = `stock_logs_report_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share Excel Report' });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
      }
    }
  } catch (error) {
    throw error;
  }
}

export async function exportStockLogsToPDF(logs: StockLogEntry[]): Promise<void> {
  try {
    const totalAdd = logs.filter((l) => l.type === 'add').reduce((sum, l) => sum + l.quantity, 0);
    const totalDeduct = logs.filter((l) => l.type === 'deduct').reduce((sum, l) => sum + l.quantity, 0);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; text-align: center; color: #8C6239; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; padding: 15px; background: #F7F5F0; border-radius: 8px; border: 1px solid #E6E1DA; }
            .summary-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #5C5854; }
            .summary-grid { display: flex; justify-content: space-between; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background-color: #8C6239; color: white; padding: 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #E6E1DA; }
            tr:nth-child(even) { background-color: #FDFDFB; }
          </style>
        </head>
        <body>
          <h1>Bregid Footwear - Stock Logs Report</h1>
          <div class="summary">
            <div class="summary-title">REPORT SUMMARY</div>
            <div class="summary-grid">
              <div><strong>Total Entries:</strong> ${logs.length}</div>
              <div><strong>Total Added:</strong> +${totalAdd.toFixed(2)}</div>
              <div><strong>Total Deducted:</strong> -${totalDeduct.toFixed(2)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Material</th>
                <th>Type</th>
                <th>Type Info</th>
                <th>Qty</th>
                <th>Added By</th>
                <th>Supplier Info</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((log) => `
                <tr>
                  <td>${new Date(log.timestamp).toLocaleDateString('en-GB')}</td>
                  <td>${log.material.charAt(0).toUpperCase() + log.material.slice(1)}</td>
                  <td>${log.type === 'add' ? 'Add' : 'Deduct'}</td>
                  <td>${log.materialType || ''} ${log.footbedGender ? `${log.footbedGender} EU ${log.footbedEuSize}` : ''}</td>
                  <td>${log.quantity.toFixed(log.unit === 'sqf' ? 2 : 0)} ${log.unit}</td>
                  <td>${log.updatedByName}</td>
                  <td>${log.supplierName ? `${log.supplierName} (Inv: ${log.invoiceNumber || '—'})` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.setAttribute('download', `stock_logs_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF Report' });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
      }
    }
  } catch (error) {
    throw error;
  }
}