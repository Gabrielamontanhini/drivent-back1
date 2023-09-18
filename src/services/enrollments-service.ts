import { Address, Enrollment } from '@prisma/client';
import { request } from '@/utils/request';
import { invalidDataError, badRequestError } from '@/errors';
import { addressRepository, CreateAddressParams, enrollmentRepository, CreateEnrollmentParams } from '@/repositories';
import { exclude } from '@/utils/prisma-utils';
import { ObjectViaCEP, RawErrorViaCEP, ViaCEPAddressResponse, ResponseViaCEP } from '@/protocols';
import { AxiosPromise, AxiosResponse } from 'axios';



async function getAddressFromCEP(cep: string): Promise<ObjectViaCEP> {



  const result = await request.get(`${process.env.VIA_CEP_API}/${cep}/json/`) as ResponseViaCEP;


  if (result.data.hasOwnProperty('erro')) {
    throw invalidDataError("CEP");
  }

  if (result.data.hasOwnProperty('erro')) {
    throw invalidDataError("CEP");
  }

  const location = result as ViaCEPAddressResponse;

  return {
    logradouro: location.data.logradouro,
    complemento: location.data.complemento,
    bairro: location.data.bairro,
    cidade: location.data.localidade,
    uf: location.data.uf
  }
}

async function getOneWithAddressByUserId(userId: number): Promise<GetOneWithAddressByUserIdResult> {
  const enrollmentWithAddress = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollmentWithAddress) throw badRequestError("Enrollment missing");

  const [firstAddress] = enrollmentWithAddress.Address;
  const address = getFirstAddress(firstAddress);

  return {
    ...exclude(enrollmentWithAddress, 'userId', 'createdAt', 'updatedAt', 'Address'),
    ...(!!address && { address }),
  };
}

type GetOneWithAddressByUserIdResult = Omit<Enrollment, 'userId' | 'createdAt' | 'updatedAt'>;

function getFirstAddress(firstAddress: Address): GetAddressResult {
  if (!firstAddress) return null;

  return exclude(firstAddress, 'createdAt', 'updatedAt', 'enrollmentId');
}

type GetAddressResult = Omit<Address, 'createdAt' | 'updatedAt' | 'enrollmentId'>;

async function createOrUpdateEnrollmentWithAddress(params: CreateOrUpdateEnrollmentWithAddress) {
  const enrollment = exclude(params, 'address');

  
  enrollment.birthday = new Date(enrollment.birthday);
  const address = getAddressForUpsert(params.address);

  const cepString = address.addressDetail.cep.replace(/\D/g, '') 
  await getAddressFromCEP(cepString);

  const newEnrollment = await enrollmentRepository.upsert(params.userId, enrollment, exclude(enrollment, 'userId'));

  await addressRepository.upsert(newEnrollment.id, address, address);
}

function getAddressForUpsert(address: CreateAddressParams) {
  return {
    ...address,
    ...(address?.addressDetail && { addressDetail: address.addressDetail }),
  };
}

export type CreateOrUpdateEnrollmentWithAddress = CreateEnrollmentParams & {
  address: CreateAddressParams;
};

export const enrollmentsService = {
  getOneWithAddressByUserId,
  createOrUpdateEnrollmentWithAddress,
  getAddressFromCEP,
};
