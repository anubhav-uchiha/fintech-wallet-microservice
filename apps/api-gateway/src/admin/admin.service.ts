import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AdminService {
  constructor(
    @Inject('COMMISSION_SERVICE')
    private readonly commissionClient: ClientProxy,

    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
  ) {}

  async createCommission(dto: any) {
    try {
      console.log('Sending...');
      console.log(dto);

      const result = await firstValueFrom(
        this.commissionClient.send({ cmd: 'create_commission' }, dto),
      );

      console.log('Received');
      console.log(result);

      return result;
    } catch (error) {
      console.log('========== TCP ERROR ==========');
      console.log(error);
      throw error;
    }
  }

  async getAllCommission() {
    return await firstValueFrom(
      this.commissionClient.send({ cmd: 'get_all_commission' }, {}),
    );
  }

  async getCommissionById(id: string) {
    return await firstValueFrom(
      this.commissionClient.send({ cmd: 'get_commission_by_id' }, id),
    );
  }

  async updateCommission(id: string, dto: any) {
    return await firstValueFrom(
      this.commissionClient.send(
        { cmd: 'update_commission' },
        {
          id,
          dto,
        },
      ),
    );
  }

  async deleteCommission(id: string) {
    return await firstValueFrom(
      this.commissionClient.send({ cmd: 'delete_commission' }, id),
    );
  }

  async getAllUsers() {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_all_users' }, {}),
    );
  }

  async getUser(id: string) {
    return await firstValueFrom(this.authClient.send({ cmd: 'get_user' }, id));
  }

  async blockUser(id: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'block_user' }, id),
    );
  }

  async unblockUser(id: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'unblock_user' }, id),
    );
  }

  async deleteUser(id: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'delete_user' }, id),
    );
  }
}
