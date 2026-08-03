import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';

const categoryService = new CategoryService(new CategoryRepository());

export class CategoryController {
  async create(req: Request, res: Response) {
    const category = await categoryService.create(req.user!.id, req.body);
    res.status(201).json(category);
  }

  async list(req: Request, res: Response) {
    const categories = await categoryService.listByUser(req.user!.id);
    res.status(200).json(categories);
  }

  async update(req: Request, res: Response) {
    const category = await categoryService.update(req.user!.id, req.params.id, req.body);
    res.status(200).json(category);
  }

  async delete(req: Request, res: Response) {
    await categoryService.delete(req.user!.id, req.params.id);
    res.status(204).send();
  }
}
