import { Test, TestingModule } from '@nestjs/testing';
import { CommissionServiceController } from './commission-service.controller';
import { CommissionServiceService } from './commission-service.service';

describe('CommissionServiceController', () => {
  let commissionServiceController: CommissionServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CommissionServiceController],
      providers: [CommissionServiceService],
    }).compile();

    commissionServiceController = app.get<CommissionServiceController>(CommissionServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(commissionServiceController.getHello()).toBe('Hello World!');
    });
  });
});
