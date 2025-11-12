import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() dto: any) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  getAll() {
    const store = this.ordersService.getStore();
    const orders = Array.from(store.values());
    return { data: orders, count: orders.length };
  }

  @Get(':orderId')
  getOne(@Param('orderId') id: string) {
    return this.ordersService.getStore().get(id) ?? { message: 'not found' };
  }
}
