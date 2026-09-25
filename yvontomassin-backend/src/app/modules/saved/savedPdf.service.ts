import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { s3Service } from '../../services/s3.service';
import { ISavedContent, ISavedSnapshot } from './saved.interface';

const SLOT_LABEL: Record<string, string> = {
  Breakfast: 'COLAZIONE',
  Snack: 'MERENDA',
  'Snack 2': 'MERENDA 2',
  'Snack 3': 'MERENDA 3',
  Lunch: 'PRANZO',
  Dinner: 'CENA',
};

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * Robust image loader that:
 * 1. Checks S3 via s3Service
 * 2. Falls back to direct HTTP/HTTPS fetch
 * 3. Falls back to local disk (uploads directory)
 * 4. Converts ANY image (including WebP) to PNG using sharp so PDFKit renders it natively
 */
const loadImageBuffer = async (imageUrl?: string | null): Promise<Buffer | null> => {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) return null;

  let rawBuffer: Buffer | null = null;
  const cleanUrl = imageUrl.trim();

  // 1. Try S3 service first if it looks like an S3 or absolute URL
  try {
    const object = await s3Service.getImageObjectByUrl(cleanUrl);
    if (object?.body) {
      rawBuffer = await streamToBuffer(object.body);
    }
  } catch {
    // S3 fetch failed or URL is not S3, continue to fallbacks
  }

  // 2. Try HTTP/HTTPS fetch (for Cloudinary, CDN, or direct public URLs)
  if (!rawBuffer && /^https?:\/\//i.test(cleanUrl)) {
    try {
      if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(cleanUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          rawBuffer = Buffer.from(arrayBuf);
        }
      }
    } catch {
      // Remote fetch failed
    }
  }

  // 3. Try local filesystem (e.g. /uploads/... or relative paths)
  if (!rawBuffer) {
    try {
      const sanitized = cleanUrl.replace(/^\/+/, '');
      const possiblePaths = [
        path.join(process.cwd(), sanitized),
        path.join(process.cwd(), 'uploads', path.basename(sanitized)),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          rawBuffer = await fs.promises.readFile(p);
          break;
        }
      }
    } catch {
      // Local read failed
    }
  }

  if (!rawBuffer || rawBuffer.length === 0) return null;

  // 4. Convert to PNG using sharp (PDFKit only supports PNG & JPEG, rejects WebP)
  try {
    return await sharp(rawBuffer)
      .resize({ width: 220, height: 220, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn('Sharp PNG conversion error for PDF image:', err);
    return null;
  }
};

/**
 * Builds a clean, professional, single-page A4 PDF containing all meals, macros, and images.
 */
export const buildSavedPdf = async (saved: ISavedContent & { createdAt?: Date }): Promise<Buffer> => {
  const snapshot: ISavedSnapshot = saved.snapshot;
  const isStrategy = saved.type === 'strategy';
  const title = isStrategy ? 'STRATEGIA SGARRO' : 'GIORNATA SALVATA';

  // Standard A4: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 32;
  const contentWidth = pageWidth - marginX * 2; // 531.28 pt

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true,
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Collect all items to render
  const meals = [
    ...snapshot.slots.map((slot) => ({
      slotName: SLOT_LABEL[slot.slot] ?? slot.slot,
      meal: slot.meal,
      isCheat: false,
    })),
    ...(snapshot.cheatMeals || []).map((cheat) => ({
      slotName: 'SGARRO',
      meal: {
        name: cheat.name || 'Sgarro',
        calories: cheat.calories ?? 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        description: cheat.description,
        image: cheat.image,
      },
      isCheat: true,
    })),
  ];

  // Pre-fetch all images in parallel
  const imageBuffers = await Promise.all(
    meals.map((item) => (item.meal?.image ? loadImageBuffer(item.meal.image) : Promise.resolve(null)))
  );

  let currentY = 26;

  // ── 1. Top Decorative Brand Bar ──
  doc.rect(0, 0, pageWidth, 5).fill('#8F00FF');

  // ── 2. Header Section ──
  doc.fillColor('#8F00FF').fontSize(16).font('Helvetica-Bold').text(title, marginX, currentY);
  currentY += 20;

  const planTitle = saved.title || 'Piano Alimentare';
  const dateStr = saved.createdAt
    ? new Date(saved.createdAt).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  doc.fillColor('#4B5563').fontSize(10).font('Helvetica').text(
    dateStr ? `${planTitle}  ·  ${dateStr}` : planTitle,
    marginX,
    currentY
  );

  // Macro Summary Box (top-right)
  const macroBoxWidth = 230;
  const macroBoxHeight = 38;
  const macroBoxX = pageWidth - marginX - macroBoxWidth;
  const macroBoxY = 22;

  doc.roundedRect(macroBoxX, macroBoxY, macroBoxWidth, macroBoxHeight, 6)
    .fillAndStroke('#FAF5FF', '#E9D5FF');

  doc.fillColor('#8F00FF').fontSize(11).font('Helvetica-Bold').text(
    `Totale: ${snapshot.dailyTotalCalories || 0} / ${snapshot.calorieGoal || 0} kcal`,
    macroBoxX + 10,
    macroBoxY + 6,
    { width: macroBoxWidth - 20 }
  );

  doc.fillColor('#6B7280').fontSize(8.5).font('Helvetica').text(
    `P: ${snapshot.dailyTotalProtein || 0}g  ·  C: ${snapshot.dailyTotalCarbohydrates || 0}g  ·  F: ${snapshot.dailyTotalFat || 0}g`,
    macroBoxX + 10,
    macroBoxY + 22,
    { width: macroBoxWidth - 20 }
  );

  currentY += 16;

  // ── 3. Strategy Instructions (if applicable) ──
  if (isStrategy) {
    const instructions = snapshot.instructions?.length
      ? snapshot.instructions
      : [
          'Usa VARIANTE per pasti con meno calorie senza altri filtri.',
          'Usa ELIMINA QUESTO PASTO per ridurre il totale calorico giornaliero.',
          'Aggiungi lo sgarro con AGGIUNGI LO SGARRO a giornata bilanciata.',
        ];

    const instrBoxY = currentY;
    const instrHeight = 32;

    doc.roundedRect(marginX, instrBoxY, contentWidth, instrHeight, 5)
      .fillAndStroke('#F9FAFB', '#E5E7EB');

    doc.fillColor('#8F00FF').fontSize(8).font('Helvetica-Bold').text(
      'ISTRUZIONI STRATEGIA:',
      marginX + 8,
      instrBoxY + 5
    );

    doc.fillColor('#4B5563').fontSize(7.5).font('Helvetica').text(
      instructions.join('   |   '),
      marginX + 8,
      instrBoxY + 16,
      { width: contentWidth - 16, ellipsis: true }
    );

    currentY += instrHeight + 8;
  } else {
    currentY += 8;
  }

  // Divider line
  doc.moveTo(marginX, currentY).lineTo(pageWidth - marginX, currentY).strokeColor('#E5E7EB').stroke();
  currentY += 10;

  // ── 4. Meals Cards (Strictly Sized to Fit 1 Single Page) ──
  const count = Math.max(meals.length, 1);
  const bottomMargin = 25;
  const availableHeight = pageHeight - currentY - bottomMargin;

  // Dynamically calculate card height and thumbnail size based on number of items
  const cardGap = count > 6 ? 5 : 7;
  const cardHeight = Math.min(
    count <= 4 ? 98 : count <= 5 ? 86 : count <= 6 ? 74 : 64,
    Math.floor((availableHeight - (count - 1) * cardGap) / count)
  );
  const thumbSize = Math.max(cardHeight - 14, 42);

  meals.forEach((item, index) => {
    const cardY = currentY + index * (cardHeight + cardGap);
    const isCheat = item.isCheat;
    const meal = item.meal;
    const imgBuf = imageBuffers[index];

    // Card background
    doc.roundedRect(marginX, cardY, contentWidth, cardHeight, 6)
      .fillAndStroke(isCheat ? '#FFFBEB' : '#FFFFFF', isCheat ? '#FDE68A' : '#E5E7EB');

    // Left accent bar
    doc.roundedRect(marginX, cardY, 4, cardHeight, 2)
      .fill(isCheat ? '#F59E0B' : '#8F00FF');

    // Thumbnail area
    const thumbX = marginX + 10;
    const thumbY = cardY + Math.floor((cardHeight - thumbSize) / 2);

    if (imgBuf) {
      try {
        doc.image(imgBuf, thumbX, thumbY, {
          fit: [thumbSize, thumbSize],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // Fallback placeholder box
        doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 4)
          .fillAndStroke('#F3F4F6', '#E5E7EB');
        doc.fillColor('#9CA3AF').fontSize(7.5).font('Helvetica-Bold')
          .text(isCheat ? 'SGARRO' : 'PASTO', thumbX, thumbY + Math.floor(thumbSize / 2) - 4, {
            width: thumbSize,
            align: 'center',
          });
      }
    } else {
      // Placeholder box
      doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 4)
        .fillAndStroke('#F3F4F6', '#E5E7EB');
      doc.fillColor('#9CA3AF').fontSize(7.5).font('Helvetica-Bold')
        .text(isCheat ? 'SGARRO' : 'PASTO', thumbX, thumbY + Math.floor(thumbSize / 2) - 4, {
          width: thumbSize,
          align: 'center',
        });
    }

    // Text content area (to right of thumbnail)
    const textX = thumbX + thumbSize + 12;
    const textWidth = contentWidth - (textX - marginX) - 10;
    let textY = cardY + 7;

    // Line 1: Slot Badge + Meal Name
    const badgeText = item.slotName.toUpperCase();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(isCheat ? '#B45309' : '#8F00FF');
    doc.text(badgeText, textX, textY, { continued: true });
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
    doc.text(`   ${meal?.name || 'Pasto rimosso'}`, {
      width: textWidth,
      ellipsis: true,
    });

    textY += 16;

    // Line 2: Macros & Calories
    if (meal) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(isCheat ? '#B45309' : '#8F00FF');
      doc.text(`${meal.calories || 0} kcal`, textX, textY, { continued: true });
      doc.fontSize(8).font('Helvetica').fillColor('#6B7280');
      doc.text(
        `   ·   P: ${meal.protein || 0}g   ·   C: ${meal.carbohydrates || 0}g   ·   F: ${meal.fat || 0}g`
      );
      textY += 13;
    }

    // Line 3: Description / Ingredients (compact, 1-2 lines)
    if (meal?.description) {
      const cleanDesc = meal.description.replace(/\s+/g, ' ').trim();
      const maxDescHeight = cardHeight - (textY - cardY) - 5;
      if (maxDescHeight > 9) {
        doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563');
        doc.text(cleanDesc, textX, textY, {
          width: textWidth,
          height: maxDescHeight,
          ellipsis: true,
        });
      }
    }
  });

  // Footer note
  doc.fontSize(7).font('Helvetica').fillColor('#9CA3AF').text(
    'Yvon Tomassin Nutrition & Performance  ·  Documento generato automaticamente',
    marginX,
    pageHeight - 16,
    { width: contentWidth, align: 'center' }
  );

  doc.end();
  return done;
};
