import { IUser } from '@shared/types';

interface ApiResponse {
  data: IUser[];
}

export async function getUsers(): Promise<IUser[]> {
  const response = await fetch('http://localhost:8080/api/data');


  const data: IUser[] = json.data;
  return data;


  const json: ApiResponse = await response.json();
  return json.data;
}