export interface ICheatNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface ICheat {
  name: string;
  description: string;
  image?: string;
  nutrition: ICheatNutrition;
}
