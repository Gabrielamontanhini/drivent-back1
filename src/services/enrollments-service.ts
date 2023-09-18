import { Address, Enrollment } from '@prisma/client';
import { request } from '@/utils/request';
import { invalidDataError, badRequestError } from '@/errors';
import { addressRepository, CreateAddressParams, enrollmentRepository, CreateEnrollmentParams } from '@/repositories';
import { exclude } from '@/utils/prisma-utils';
import { ObjectViaCEP, RawErrorViaCEP, RawObjectViaCEP, ResponseViaCEP } from '@/protocols';
import { AxiosPromise, AxiosResponse } from 'axios';

// TODO - Receber o CEP por parâmetro nesta função.

async function getAddressFromCEP(cep: string): Promise<ObjectViaCEP> {
  const result = await request.get(`${process.env.VIA_CEP_API}/${cep}/json/`) as ResponseViaCEP;

  if (result.data.hasOwnProperty('erro')) {
    throw invalidDataError("CEP");
  }



  // const validatedObject = validatedRawObject.data;
  
  // console.log("validatedObject:",validatedObject)

  // TODO: Tratar regras de negócio e lanças eventuais erros
  if (result.data.hasOwnProperty('erro')) {
    throw invalidDataError("CEP");
  }

  const validatedRawObject = result as RawObjectViaCEP;

  // FIXME: não estamos interessados em todos os campos

  let myResult = {...validatedRawObject.data, cidade: validatedRawObject.data.localidade};
  delete myResult.cep;
  delete myResult.localidade;
  delete myResult.ibge;
  delete myResult.gia;
  delete myResult.siafi;
  delete myResult.ddd;

  return myResult;
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

  // TODO - Verificar se o CEP é válido antes de associar ao enrollment.
  const cepString = address.cep.replace(/\D/g, '') 
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
