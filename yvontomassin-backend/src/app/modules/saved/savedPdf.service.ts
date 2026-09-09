import PDFDocument from 'pdfkit';
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

const streamToBuffer = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const loadImageBuffer = async (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  try {
    const object = await s3Service.getImageObjectByUrl(imageUrl);
    if (!object?.body) return null;
    return await streamToBuffer(object.body);
  } catch {
    return null;
  }
};

const drawWrapped = (
  doc: PDFKit.PDFDocument,
  text: string,
  options?: PDFKit.Mixins.TextOptions
) => {
  doc.text(text, { width: 515, ...options });
};

export const buildSavedPdf = async (saved: ISavedContent & { createdAt?: Date }) => {
  const snapshot: ISavedSnapshot = saved.snapshot;
  const title =
    saved.type === 'strategy' ? 'Strategia sgarro' : 'Giornata salvata';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fillColor('#111111').fontSize(20).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.fillColor('#555555').fontSize(11).font('Helvetica').text(saved.title);
  if (saved.createdAt) {
    doc.text(new Date(saved.createdAt).toLocaleString('it-IT'));
  }
  doc.moveDown(0.6);
  doc.fillColor('#8F00FF').fontSize(12).font('Helvetica-Bold').text(
    `${snapshot.dailyTotalCalories} / ${snapshot.calorieGoal} kcal`
  );
  doc.fillColor('#333333').fontSize(10).font('Helvetica').text(
    `P ${snapshot.dailyTotalProtein}g · C ${snapshot.dailyTotalCarbohydrates}g · F ${snapshot.dailyTotalFat}g`
  );

  if (saved.type === 'strategy') {
    doc.moveDown(0.8);
    doc.fillColor('#111111').fontSize(14).font('Helvetica-Bold').text('Istruzioni');
    doc.moveDown(0.3);
    const instructions = snapshot.instructions?.length
      ? snapshot.instructions
      : [
          'Usa VARIANTE per scegliere pasti con meno calorie, senza altri filtri.',
          'Usa ELIMINA QUESTO PASTO se vuoi ridurre il totale giornaliero.',
          'Aggiungi lo sgarro con AGGIUNGI LO SGARRO dopo aver bilanciato la giornata.',
        ];
    doc.font('Helvetica').fontSize(11).fillColor('#222222');
    instructions.forEach((line, index) => {
      drawWrapped(doc, `${index + 1}. ${line}`);
      doc.moveDown(0.2);
    });
  }

  const meals = [
    ...snapshot.slots.map((slot) => ({
      heading: `${SLOT_LABEL[slot.slot] ?? slot.slot}${slot.meal ? ` — ${slot.meal.name}` : ''}`,
      meal: slot.meal,
    })),
    ...snapshot.cheatMeals.map((cheat) => ({
      heading: `SGARRO — ${cheat.name}`,
      meal: {
        name: cheat.name,
        calories: cheat.calories,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        description: cheat.description,
        image: cheat.image,
      },
    })),
  ];

  for (const item of meals) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.8);
    doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold').text(item.heading);
    if (!item.meal) {
      doc.font('Helvetica').fontSize(10).fillColor('#666666').text('Pasto rimosso');
      continue;
    }

    doc.font('Helvetica').fontSize(10).fillColor('#8F00FF').text(
      `${item.meal.calories} kcal · P ${item.meal.protein}g · C ${item.meal.carbohydrates}g · F ${item.meal.fat}g`
    );

    const imageBuffer = await loadImageBuffer(item.meal.image);
    if (imageBuffer) {
      try {
        const startY = doc.y + 8;
        doc.image(imageBuffer, { fit: [160, 160], align: 'left' });
        doc.y = Math.max(doc.y, startY + 168);
      } catch {
        // skip unreadable images so the PDF still generates
      }
    }

    if (item.meal.description) {
      doc.moveDown(0.2);
      doc.fillColor('#333333').fontSize(10).font('Helvetica');
      drawWrapped(doc, item.meal.description);
    }
  }

  doc.end();
  return done;
};
