import type { OrderSummaryItem } from '../types';

export interface AGStudioField {
  name: string;
  label: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

export interface AGStudioSource {
  name: string;
  data: any[];
  fields: AGStudioField[];
}

export interface AGStudioRelationship {
  type: string;
  from: { source: string; field: string };
  to: { source: string; field: string };
}

export interface AGStudioExpression {
  source: string;
  name: string;
  label: string;
  dataType: string;
  expression: string;
}

export interface AGStudioDataConfig {
  description: string;
  sources: AGStudioSource[];
  relationships: AGStudioRelationship[];
  expressions: AGStudioExpression[];
  calendar: {
    startDate: string;
    endDate: string;
    defaultRange: string;
  };
}

export interface AGReportWidget {
  id: string;
  type: 'grid' | 'bar' | 'pie' | 'kpi' | 'line';
  title: string;
  source: string;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  filter?: { field: string; operator: string; value: any };
  xField?: string;
  yField?: string;
}

export interface AGReportLayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AGReportState {
  selectedPageId: string;
  pages: {
    id: string;
    title: string;
    widgets: AGReportWidget[];
    layout: AGReportLayoutItem[];
  }[];
}

/**
 * Extracts temporal boundaries across dataset date fields (Section 2.4 of Blueprint)
 */
export function getDatasetDateBounds(datasets: any[][]): { startDate: string; endDate: string } {
  let minDate = Infinity;
  let maxDate = -Infinity;

  datasets.forEach((dataset) => {
    if (Array.isArray(dataset)) {
      dataset.forEach((item) => {
        const rawDate = item.created_at || item.create_time || item.due_date || item.transaction_initiation_date;
        if (rawDate) {
          const timeVal = new Date(rawDate).getTime();
          if (!isNaN(timeVal)) {
            if (timeVal < minDate) minDate = timeVal;
            if (timeVal > maxDate) maxDate = timeVal;
          }
        }
      });
    }
  });

  const now = new Date();
  return {
    startDate: minDate === Infinity ? new Date(now.getFullYear(), 0, 1).toISOString() : new Date(minDate).toISOString(),
    endDate: maxDate === -Infinity ? now.toISOString() : new Date(maxDate).toISOString(),
  };
}

/**
 * Builds the canonical AG Studio Data Configuration Object (Section 2.1 of Blueprint)
 */
export function buildStudioDataConfig(orders: OrderSummaryItem[], sessionId: string): AGStudioDataConfig {
  const transformedOrders = orders.map((o) => ({
    id: o.order_id,
    quoteId: o.quote_id,
    customerId: sessionId,
    sku: o.sku,
    title: o.item_title || o.sku,
    status: o.status,
    issued_amount: o.amount,
    paid_amount: o.status === 'PAID' ? o.amount : 0,
    currency: o.currency,
    paypalOrderId: o.paypal_order_id || '',
    captureId: o.capture_id || '',
    create_time: o.created_at,
  }));

  const transformedTransactions = orders
    .filter((o) => Boolean(o.capture_id))
    .map((o) => ({
      transaction_id: o.capture_id || '',
      order_id: o.order_id,
      provider: 'paypal_sandbox',
      transaction_status: o.status === 'PAID' ? 'COMPLETED' : o.status,
      gross_amount: o.amount,
      fee_amount: Number((o.amount * 0.029 + 0.3).toFixed(2)),
      net_amount: Number((o.amount - (o.amount * 0.029 + 0.3)).toFixed(2)),
      currency: o.currency,
      transaction_initiation_date: o.created_at,
    }));

  const customers = [
    {
      id: sessionId,
      given_name: 'Sandbox Buyer',
      company_name: 'PayPilot Consumer',
      status: 'VERIFIED',
    },
  ];

  const bounds = getDatasetDateBounds([transformedOrders, transformedTransactions]);

  return {
    description:
      'PayPal Financial Analytics Data Model - Enterprise Invoicing, Subscriptions, and Customer Metrics',
    sources: [
      {
        name: 'orders',
        data: transformedOrders,
        fields: [
          { name: 'id', label: 'Order ID', dataType: 'string' },
          { name: 'customerId', label: 'Customer ID', dataType: 'string' },
          { name: 'sku', label: 'Product SKU', dataType: 'string' },
          { name: 'title', label: 'Product Title', dataType: 'string' },
          { name: 'status', label: 'Order Status', dataType: 'string' },
          { name: 'issued_amount', label: 'Issued Amount ($)', dataType: 'number' },
          { name: 'paid_amount', label: 'Paid Amount ($)', dataType: 'number' },
          { name: 'paypalOrderId', label: 'PayPal Order ID', dataType: 'string' },
          { name: 'captureId', label: 'PayPal Capture ID', dataType: 'string' },
          { name: 'create_time', label: 'Created Time', dataType: 'date' },
        ],
      },
      {
        name: 'transactions',
        data: transformedTransactions,
        fields: [
          { name: 'transaction_id', label: 'Capture ID', dataType: 'string' },
          { name: 'order_id', label: 'Order ID', dataType: 'string' },
          { name: 'provider', label: 'Payment Gateway', dataType: 'string' },
          { name: 'transaction_status', label: 'Capture Status', dataType: 'string' },
          { name: 'gross_amount', label: 'Gross Volume ($)', dataType: 'number' },
          { name: 'fee_amount', label: 'Processing Fee ($)', dataType: 'number' },
          { name: 'net_amount', label: 'Net Settled ($)', dataType: 'number' },
          { name: 'transaction_initiation_date', label: 'Capture Timestamp', dataType: 'date' },
        ],
      },
      {
        name: 'customers',
        data: customers,
        fields: [
          { name: 'id', label: 'Customer ID', dataType: 'string' },
          { name: 'given_name', label: 'Buyer Name', dataType: 'string' },
          { name: 'company_name', label: 'Entity / Company', dataType: 'string' },
          { name: 'status', label: 'Verification Status', dataType: 'string' },
        ],
      },
    ],
    relationships: [
      {
        type: 'many-to-one',
        from: { source: 'orders', field: 'customerId' },
        to: { source: 'customers', field: 'id' },
      },
      {
        type: 'many-to-one',
        from: { source: 'transactions', field: 'order_id' },
        to: { source: 'orders', field: 'id' },
      },
    ],
    expressions: [
      {
        source: 'orders',
        name: 'collection_rate',
        label: 'Collection Rate (%)',
        dataType: 'number',
        expression: 'paid_amount / issued_amount',
      },
    ],
    calendar: {
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      defaultRange: 'thisYear',
    },
  };
}

/**
 * Generates the serialized AGReportState JSON (Section 3.2 of Blueprint)
 */
export function generateAGReportState(): AGReportState {
  return {
    selectedPageId: 'revenue_overview',
    pages: [
      {
        id: 'revenue_overview',
        title: 'PayPal Payments & Revenue Overview',
        widgets: [
          {
            id: 'open_orders_grid',
            type: 'grid',
            title: 'Orders Ledger',
            source: 'orders',
            sort: [{ field: 'create_time', direction: 'desc' }],
          },
          {
            id: 'revenue_chart',
            type: 'bar',
            title: 'Settled Revenue by Product',
            source: 'orders',
            xField: 'title',
            yField: 'paid_amount',
          },
          {
            id: 'settlement_pie',
            type: 'pie',
            title: 'Order Status Distribution',
            source: 'orders',
            xField: 'status',
            yField: 'issued_amount',
          },
        ],
        layout: [
          { widgetId: 'open_orders_grid', x: 0, y: 0, w: 12, h: 5 },
          { widgetId: 'revenue_chart', x: 0, y: 5, w: 6, h: 4 },
          { widgetId: 'settlement_pie', x: 6, y: 5, w: 6, h: 4 },
        ],
      },
    ],
  };
}
