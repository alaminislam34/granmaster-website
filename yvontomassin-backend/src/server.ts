import dns from 'node:dns';
import mongoose from 'mongoose';
import { Server } from 'http';
import config from './app/config';
import app from './app';
import { seedAdmin } from './app/modules/user/seed.admin';
import { nutritionService } from './app/modules/nutrition/nutrition.service';

let server: Server;
const port = config.port;
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

async function main() {
  try {
    await mongoose.connect(config.database_url as string);

    // Seed admin user on startup
    await seedAdmin();

    // Auto-sync all Nutrition entries → MealPlanner Meal collection
    const syncResult = await nutritionService.syncAllNutritionToMealPlanner();
    console.log(`✅ Nutrition → MealPlanner sync: ${syncResult.synced} synced, ${syncResult.skipped} skipped`);

    server = app.listen(port, () => {
      console.log(`yvontomassin web app listening on port ${port}`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();

process.on('unhandledRejection', () => {
  console.log(`😈🙉 unhandledRejection is detected. Shutting down...`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log(`😈🙉 uncaughtException is detected. Shutting down...`);
  process.exit(1);
});
