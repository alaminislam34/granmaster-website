import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import { portionFilterService } from './portionFilter.service';

const getPortionFilters = catchAsync(async (_req, res) => {
  const result = await portionFilterService.getPortionFilters();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Portion filters retrieved',
    data: result,
  });
});

const updatePortionFilters = catchAsync(async (req, res) => {
  const result = await portionFilterService.updatePortionFilters(req.body.table);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Filtri porzione aggiornati',
    data: result,
  });
});

export const portionFilterController = {
  getPortionFilters,
  updatePortionFilters,
};
