export interface ICheatNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  alcohol?: number;
}

export interface ICheat {
  name: string;
  description: string;
  image?: string;
  nutrition: ICheatNutrition;
}
