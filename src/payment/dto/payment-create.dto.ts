import { IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class PaymentCreateDto {
  @IsNumber()
  orderId!: number;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsBoolean()
  @IsOptional()
  capture?: boolean;
}
