// backend/routes/reports.js - Updated with PDF generation
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET /api/reports/daily - Generate daily report
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await Event.find({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: -1 });

    // Generate summary statistics
    const stats = {
      totalEvents: events.length,
      eventTypes: {},
      hourlyActivity: {},
      locations: {}
    };

    events.forEach(event => {
      // Count event types
      stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;
      
      // Count hourly activity
      const hour = event.timestamp.getHours();
      stats.hourlyActivity[hour] = (stats.hourlyActivity[hour] || 0) + 1;
      
      // Count locations
      stats.locations[event.location] = (stats.locations[event.location] || 0) + 1;
    });

    res.json({
      success: true,
      date: date.toDateString(),
      events,
      summary: stats,
      report: generateDailyReportText(events, stats, date)
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate daily report',
      message: error.message 
    });
  }
});

// GET /api/reports/weekly - Generate weekly report
router.get('/weekly', async (req, res) => {
  try {
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const events = await Event.find({
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: -1 });

    // Generate weekly statistics
    const dailyStats = {};
    const eventTypeStats = {};
    
    events.forEach(event => {
      const dayKey = event.timestamp.toDateString();
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = 0;
      }
      dailyStats[dayKey]++;
      
      eventTypeStats[event.eventType] = (eventTypeStats[event.eventType] || 0) + 1;
    });

    res.json({
      success: true,
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      totalEvents: events.length,
      dailyBreakdown: dailyStats,
      eventTypes: eventTypeStats,
      events: events.slice(0, 100) // Limit to 100 most recent for display
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate weekly report',
      message: error.message 
    });
  }
});

// GET /api/reports/export/pdf - Export report as PDF
router.get('/export/pdf', async (req, res) => {
  try {
    const { startDate, endDate, type = 'daily' } = req.query;
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to today
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const events = await Event.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });

    // Create PDF
    const doc = new PDFDocument();
    const filename = `surveillance_report_${start.toISOString().split('T')[0]}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Generate PDF content
    generatePDFReport(doc, events, start, end);
    
    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export PDF',
      message: error.message 
    });
  }
});

// GET /api/reports/export/csv - Export report as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const events = await Event.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });

    // Generate CSV content
    const csvContent = generateCSVReport(events);
    const filename = `surveillance_report_${start.toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export CSV',
      message: error.message 
    });
  }
});

// Helper function to generate daily report text
function generateDailyReportText(events, stats, date) {
  let report = `DAILY SURVEILLANCE REPORT\n`;
  report += `Date: ${date.toDateString()}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  report += `SUMMARY:\n`;
  report += `Total Events: ${stats.totalEvents}\n\n`;
  
  if (Object.keys(stats.eventTypes).length > 0) {
    report += `EVENT BREAKDOWN:\n`;
    Object.entries(stats.eventTypes).forEach(([type, count]) => {
      report += `- ${type.replace('_', ' ').toUpperCase()}: ${count}\n`;
    });
    report += `\n`;
  }
  
  if (Object.keys(stats.hourlyActivity).length > 0) {
    report += `PEAK ACTIVITY HOURS:\n`;
    const sortedHours = Object.entries(stats.hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    sortedHours.forEach(([hour, count]) => {
      report += `- ${hour}:00 - ${count} events\n`;
    });
    report += `\n`;
  }
  
  return report;
}

// Helper function to generate PDF report
function generatePDFReport(doc, events, startDate, endDate) {
  // Header
  doc.fontSize(20).text('Surveillance System Report', 50, 50);
  doc.fontSize(12).text(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`, 50, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 95);
  doc.text(`Total Events: ${events.length}`, 50, 110);
  
  // Draw line
  doc.moveTo(50, 130).lineTo(550, 130).stroke();
  
  let yPosition = 150;
  
  // Event summary
  const eventTypes = {};
  events.forEach(event => {
    eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
  });
  
  doc.fontSize(14).text('Event Summary:', 50, yPosition);
  yPosition += 25;
  
  Object.entries(eventTypes).forEach(([type, count]) => {
    doc.fontSize(10).text(`• ${type.replace('_', ' ').toUpperCase()}: ${count}`, 70, yPosition);
    yPosition += 15;
  });
  
  yPosition += 20;
  doc.fontSize(14).text('Recent Events:', 50, yPosition);
  yPosition += 25;
  
  // List recent events (limit to first 20)
  events.slice(0, 20).forEach(event => {
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }
    
    doc.fontSize(9)
       .text(`${event.timestamp.toLocaleString()} - ${event.eventType.replace('_', ' ')}`, 70, yPosition)
       .text(event.description, 70, yPosition + 12);
    yPosition += 35;
  });
  
  if (events.length > 20) {
    doc.fontSize(10).text(`... and ${events.length - 20} more events`, 70, yPosition);
  }
}

// Helper function to generate CSV report
function generateCSVReport(events) {
  let csv = 'Timestamp,Event Type,Description,Location,Confidence,Objects Detected\n';
  
  events.forEach(event => {
    const objects = event.metadata.objectsDetected ? event.metadata.objectsDetected.join(';') : '';
    csv += `"${event.timestamp.toISOString()}","${event.eventType}","${event.description}","${event.location}",${event.confidence},"${objects}"\n`;
  });
  
  return csv;
}

module.exports = router;