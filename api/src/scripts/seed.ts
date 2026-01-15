import dotenv from "dotenv";
import mongoose from "mongoose";
import Comic from "../models/Comic";
import Video from "../models/Video";

dotenv.config();

// Real comics from Mega - 14 folders
// Note: coverImage is a fallback - actual cover is loaded dynamically from /api/comics/:id/cover (first image in Mega folder)
// Note: name can be updated manually or fetched from Mega folder name
const sampleComics = [
  {
    name: "Comic 1",
    coverImage: "", // Will be loaded from Mega folder's first image
    megaFolderLink: "https://mega.nz/folder/ehxjEDgD#J9DDyh9K71ojkxJrnri1IQ",
  },
  {
    name: "Comic 2",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/65hCGArR#b1NE567pcJfY0yBMaDVwrg",
  },
  {
    name: "Comic 3",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/ipBRjAIL#0P6M3KIl-LgGq6y9gHg3dA",
  },
  {
    name: "Comic 4",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/mhwRhYjS#dWNzuJfYfvDWrGH7JMGlKQ",
  },
  {
    name: "Comic 5",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/nkhTjABT#F0Lx-bJO-uDAKN0MzRCL7g",
  },
  {
    name: "Comic 6",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/e4gTAJRD#s_yW-F-1kDa_ggJ4XSAa8g",
  },
  {
    name: "Comic 7",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/nox1mTgS#AXcigJCiDKLmJLfKpLgLCg",
  },
  {
    name: "Comic 8",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/b4ZAiaIb#1X2LGKqQXhZEKlGhWqeCTA",
  },
  {
    name: "Comic 9",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/zkoTHByK#iZqgxb71FrU8FAvRxjNhAg",
  },
  {
    name: "Comic 10",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/H8BwlaJL#t_9ByEqqI5w4nWLguwPflw",
  },
  {
    name: "Comic 11",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/78oWkbDa#Dl7E_TLKkXCKlF1t85bbrg",
  },
  {
    name: "Comic 12",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/n1QinLZT#FNSPnpf5x-iUNLW58fFqWQ",
  },
  {
    name: "Comic 13",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/SopBVIRA#ql6oKGM3tn8SaSSS84x5CQ",
  },
  {
    name: "Comic 14",
    coverImage: "",
    megaFolderLink: "https://mega.nz/folder/bkAXlZYA#Lq-B1VRFVEDFNrBUw1kq-Q",
  },
];

// Note: thumbnail is a fallback - actual thumbnail is loaded dynamically from /api/videos/:id/thumbnail (first frame)
const sampleVideos = [
  {
    title: "video (1)",
    thumbnail: "", // Will be loaded from video's first frame
    megaVideoLink:
      "https://mega.nz/file/jogjhC7B#XTqJcOafi8HubOgSF91zWoTlgm7OpfytQi8L1BRJivg",
  },
  {
    title: "video (2)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/SlRhgLoD#Vpc7v1zpuEnjrHXW1J2CmioVztDKM3nspmkptCRIGxc",
  },
  {
    title: "video (3)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Kk4BEDSa#iYHkfOuH1MqA7L3eoFzVqOuDt_bHdf5RyzWr_LZF4Cs",
  },
  {
    title: "video (6)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/L9xC1azY#kuqnSnDH_zCwp5qpZHzUxELHdJS4gv7VqJZsA1Ozfl4",
  },
  {
    title: "video (9)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Hxg2XRQa#tPLmloqysHNUeGjwI8m6Oj7XHYGXlQQHO4nIVJCi0e4",
  },
  {
    title: "video (12)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/WxgEVDhA#I8bpA-aGUMq9FXx4KVksYwrRFEIgyoMRFUz8gmEykFY",
  },
  {
    title: "video (13)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/G1o3xCYD#CMq2_ijwj2mFP8RxmYEveJ0oJU7Nv5oV9vmWQ8sWcfc",
  },
  {
    title: "video (14)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/DpQwHbyZ#ab0CAvbRZOM5erAvBfrgkAkGqBicID3pmSc6dXus1hg",
  },
  {
    title: "video (15)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/qoJx2CxT#eODLvjovMQZzzYwzXErPAjRkKNHG0ektlXYMJP4AElE",
  },
  {
    title: "video (16)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/XsICGKzI#uZHjQlCxvOYuWABZxdzCGNw52cGoW7jFg28nzIK42t4",
  },
  {
    title: "video (17)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Cgo1jRCZ#YM2F5GwvUjDEf1fHVrmADVFpLcE5GVio66sWnCjcxwo",
  },
  {
    title: "video (18)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/LlxBxZ6K#pIXQoEk42DzP_4uTfFDP9FsxSX92c4OvFbIIadDkkLs",
  },
  {
    title: "video (19)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/ytwmEaxZ#6pqf58D0eXJlOMCdFCriIS4-wygUGB7IZ8aosp1o4cM",
  },
  {
    title: "video (20)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/G5YyTbqC#QoZxJDTWrj085oNJr6w2xcP4oN7-oWnGJW7tbZ8Ytj8",
  },
  {
    title: "video (23)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/HlhlBBCK#dk25AVhONBmrBsJaDI-ikSwkfi6hJR0k3fb3yIilla8",
  },
  {
    title: "video (27)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/bowQGbib#BF8ZKAjfdJRBKNuANiA6i5Yz6eBVH48kHocuWFSCLGY",
  },
  {
    title: "video (28)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/u1QF1DgJ#OhvzLhfT-mh1cY_MCrdpj23tSrDilbsQ7RfY6fZtsDs",
  },
  {
    title: "video (34)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/a8AnCDAL#ibOmeQ3D6CWZGlRCOQg3FzrB4fseLp16BpROGbV7cus",
  },
  {
    title: "video (35)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/b1BxEJAT#BurnWiEqI13Oj50p8lXRILdAu5P_g8tLy6n73lbGaAY",
  },
  {
    title: "video (37)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/30oghBZL#DelbG0WFYLz09ZfQUiDdC7koy2kmonFt1qvZsP4luY4",
  },
  {
    title: "video (38)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/y0IglaZZ#h7Kfwy2L6dR2QAtEoiwygyWFoaOgrZsB-2AIL8oTREA",
  },
  {
    title: "video (39)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/u1xklQJC#3ngOar2_GgwBtwKPq5RRnCUNYHEfNTqonxm-4ZYQdp0",
  },
  {
    title: "video (40)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/35oBFR7L#OPTKyDLovhdoF61UOzbsLnxcL_FP8JFHYRjRd4TUA6c",
  },
  {
    title: "video (41)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/j4JASR7R#tSIy2R-EM5owZEWNsUj4Y7dNz7ZKX62jAmSTbEueVH0",
  },
  {
    title: "video (43)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/X14SASiL#NrCJc2pltOm_zgX20EtYsw90AztQPWd3SmLml8nnzaA",
  },
  {
    title: "video (46)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/fkxR3ZyB#FLyZMm90qymRM5MJy-Kc4dFAD9WSNNI9cL-xmIHFpPs",
  },
  {
    title: "video (48)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/W1wiDAJA#9qTnXSQeumnsnLA74GpaLUnDDj3M3C5FgZKFyAFUG90",
  },
  {
    title: "video (51)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/SkZQUCgT#p1nWXeX_BE7iyK7c_-AN9C3nS-V4qH_1aaot6MekjAM",
  },
  {
    title: "video (53)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/XkYzgAoZ#Pvq32LDbE7KsWbcOYc_GT6vy5F9aYGt0gDUFzTpP2lw",
  },
  {
    title: "video (55)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/CpwQgagT#pHA4LMp_iBGsg1Zzg9Mu0c6Q9hf8odxxzmRMU0lxlvo",
  },
  {
    title: "video (58)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/L4IigRoQ#r_xeZ57UM0oHl-QVhKcJVGA7OxhALmkTffkvBRUzlcg",
  },
  {
    title: "video (59)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/b843wJTa#U7exWh9raJNEcLxCW3mstnmBJOV4izsplYCMPBXI45E",
  },
  {
    title: "video (64)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/WspzAbKB#HL-S7XuibPZma8me50m-euoa8arV-IN9fMI-Y37ONfA",
  },
  {
    title: "video (65)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/rtgDDIyQ#2R-TVRD1uliDkNzORinUTiYQuTt-Nkx02w7lAjjR4iM",
  },
  {
    title: "video (66)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/P1YRwSbJ#tOaYcYfownw2Q1h_Ib-8vSdgT9hKRQUfJht3Cly-lKk",
  },
  {
    title: "video (67)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/nkIhxKIA#fYkJbrnVNvVMpkXMwz3fwKnQ8qQQNi7_iHRaMWkdOw8",
  },
  {
    title: "video (68)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/u5pkECjI#l3PRC96zaNkJEyLJckifp4jfI-6wOR1QnM9NQEp4I1Y",
  },
  {
    title: "video (70)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/qkwzyaKS#0RQ19TzGLLNFnlN50LpMuLj73n_EOpbPP_kNxxEGoV8",
  },
  {
    title: "video (71)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/PsYEWSSC#17sNQfLVzUsgd-iRRBis_-Ps2Do82TFP0WUPG2uw9bQ",
  },
  {
    title: "video (72)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/bhxQCTRL#Xu3imLAphsfiKQhVBGNPOF6bUEwdNIRDtheoNeAJIsA",
  },
  {
    title: "video (74)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/r9Z2mASD#ikFzpQwkYCVaVSZhu0w7Y7IDas0C7N8J1_pVAyCpnYo",
  },
  {
    title: "video (75)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/P1pi1LwL#r02_28qVDxNladqz4ds5RuTHqC2P51n3vgx_z2c29is",
  },
  {
    title: "video (77)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/z5QHWTDA#A7hisBPafK5wzYVaeLPCceJsw2C9zRIhRzhpMCVVIdc",
  },
  {
    title: "video (79)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/2t5wTaxI#0UuS6dAGEYpn4F7Grm0tsbBYvhg7lJqJpZ8FD3zsn_s",
  },
  {
    title: "video (80)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Th41ASYQ#DL7ciyrz9NfSBMjuNKNUGYvcVHQIvh_eNUg1ijufFUY",
  },
  {
    title: "video (81)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/no4XAYrJ#xhrz4Xr5YajglAwr9E4HN3FEuF75g3SJ9CCu9TcNRdQ",
  },
  {
    title: "video (82)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/vhxFGYTI#4SbFUNC5c-K-npQG-MYCW_6EDY6prxtggC5Nv2-eNWM",
  },
  {
    title: "video (84)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Ot422QQY#Xt49nBQMrwUMhk7KuvulZscQ3K250sCVdYWrm9JkwRs",
  },
  {
    title: "video (87)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/q8ohUD5R#ZQH2rs8GIO7f5OyvmB_kW2RmIXhfoVtIneJzHQZb8M8",
  },
  {
    title: "video (89)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/X5Yw1ZJK#3JJ0hBgBMPqF82yQz3OnCQ6Qt6UjO8Y82L48JhYl2z8",
  },
  {
    title: "video (90)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/apBmAS6a#_UwufeBl8nhQ88w4KNumuU8P-Mc20_2RUNV_hUVeTwQ",
  },
  {
    title: "video (92)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/zlx2UYZa#zLai3J-KerQCUUnNg5nobF1VoIUi8e3ZoA2bGPc29S0",
  },
  {
    title: "video (95)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/fkZAmRxS#9doyhoPYAr6i2NFJ4s0hd8Vfvn8s6Dn-fiIMLmidTaI",
  },
  {
    title: "video (96)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/7sYDCaAR#4dYRMYAvi8UAtTVpxT81Eqoe0SbrQKaodSK6BmJASMY",
  },
  {
    title: "video (98)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/S4AzBRzY#4UUOidMJF14acRgdhhcf-HvrOIetN9vtkN-4xHmpK3o",
  },
  {
    title: "video (99)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/OlBRhSJY#Z0JaPGWpeH_-np046nDuKmm2kY0T7D3zIuYTAgEk7gk",
  },
  {
    title: "video (100)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/7wxywZCD#oy2TyIg-UiERo01_erXmyih58I6OxbF86BkcoaawAJ0",
  },
  {
    title: "video (101)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/fwIHWCrS#oFo7o1Fxw_kN7WwvYM9kTI7uOukah63SkeaV01OYQIs",
  },
  {
    title: "video (102)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/i1hxDIjC#ySz0f_OJO3SrHHgFuVFh0gGfNk5uleq2ICXJ6YNQP0o",
  },
  {
    title: "video (104)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/nkgjxC7C#zQ3G_aoQo9v5xjLLQ3PjeVzP2KH-wZlF64dh8x43wrk",
  },
  {
    title: "video (105)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/XlBmma6A#lyXJUcqLwE5XMuMlHqvufISf2LUi-fhDbiqa7f-L0Uc",
  },
  {
    title: "video (106)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/HxxnmDzb#ub0YzLP9U4x4lYHlNhouO9ogJd-NBqzUIQiVv2LXWfU",
  },
  {
    title: "video (110)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/3hxlhSBT#XTdRw0I0EP4qMpY11H9SWDpQcm-0KB-VFhHsWzVK35c",
  },
  {
    title: "video (111)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/LlIm3RbI#HOvHSA_CyC2mmtQ9KBtX2CqHsFzEqh6gvchqK7cPwsI",
  },
  {
    title: "video (115)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/KkZCVZyD#p2gMqbduFJO9iMFefLpfTx6Npr-Xc8KYpEsgcZOZCsM",
  },
  {
    title: "video (121)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/PwAlhKIY#AwCQ1JVTay5YErlasbq2BSwSXq2axQ7DfT2eUSDyueY",
  },
  {
    title: "video (122)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/il4XiArR#Dn_CYBfkV6rBrxzigw_HyW1HZhws8wFb-mR3S3db1cU",
  },
  {
    title: "video (125)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/ThojQBCB#fT48X2xIyjEwx9HzC3XjwXbg6tkHYcDTASZ9-Kp-FMY",
  },
  {
    title: "video (126)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/awhi2JgS#NDzvPTCAxoL04YF0dM61rC_Y_epvjnYzf9hNwfowoF8",
  },
  {
    title: "video (130)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/7gBUgDDA#ysgCQ5itYHRHbEyvb3dvh2sZ_TwZoaNlTdFAu-zN1NA",
  },
  {
    title: "video (131)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/e9wVxACa#0cO7_nMTvG104NOpteGFpCVlLPGJ7ZCtTfCW8QnJN0Y",
  },
  {
    title: "video (132)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/ewYljYpK#uZDyYtujmpIVqjcnctI3e40pRs2lYV45Gr18Nv7uIu8",
  },
  {
    title: "video (135)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/b9Jg1Bbb#cfAiY-BUIoGLhdYmoBygdSARSNIQ9azJPmIS76SH6tI",
  },
  {
    title: "video (136)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/rsJjwICJ#g07-9m1Ib-1o7ZCmMEPE8a1RM3674nlU8P6x3W1Pyfc",
  },
  {
    title: "video (137)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/qw5QlTpa#O9TlIO9SlVX_vi8n-K2xUkBJhwbke_I6NC7B9u-PwWQ",
  },
  {
    title: "video (140)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/jpAzyD7Z#XSd0jrQq8sjBHAN-p9WbSFkqc7dCudh5xxc0gFKQ_T4",
  },
  {
    title: "video (141)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/WxBSTJ6A#xb5Pv1kI_j5se-CGUC07kKiWsdGkUIV517qEKwfrfBc",
  },
  {
    title: "video (142)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/upIgwbDL#xTCcepHShxT0bto_W5Dnt4ACBr_Gr53elL50TRBUG90",
  },
  {
    title: "video (143)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/vxgXWRIZ#A0aPgQSiwO09Vgi1LIJ90ltoVToshAGILPoIhxotmkA",
  },
  {
    title: "video (144)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/2hAyFAob#gSgjaAV1-10KZnogd1S-29vMZsXs2bxX40Zq20PlFbo",
  },
  {
    title: "video (145)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/P8YHmRxZ#ULcc6hjUY9hiRTe8W5ldtKangy5IlZ9BE9tdu9tsJCI",
  },
  {
    title: "video (147)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/r5hzBYCa#J06EQ_ihxroYRJNl7agksK63yGwlUpGI_6kwKR97B7g",
  },
  {
    title: "video (149)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/GoZD2RRb#gxdx331Hf-uDXhL9GmylOjinu_-hvoMNtKgf3lwu7nU",
  },
  {
    title: "video (150)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/PtRExa7b#k2sKzaM-VPYJDAB9V2q-MLSY7l5Bu-UE8dXTilN4514",
  },
  {
    title: "video (151)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/CoJTRIwa#x3FPTB1tpZHKUrAGy9lQEcnoQpSuMRzaXIxL1hmjP2A",
  },
  {
    title: "video (153)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/24xHkCqT#jnNpLh3H-jurxd3jUqjCaIH65hTTCU8s86frI_Bs9mM",
  },
  {
    title: "video (155)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/S4Bx2aBB#GrIyAYkYcbf35GfwihczST0_20ZdNDqk4epIK1GA_gM",
  },
  {
    title: "video (161)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/vtJTxIya#ePSjLQLbj6Nqj_bhDSWwWVSuXRThpQSae8nHfXE25Tk",
  },
  {
    title: "video (164)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/f5Aw0AYR#z8P5ITdU_WxFzKF_m-CBH4GxWDTltOsNr4jZPyulOWc",
  },
  {
    title: "video (167)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/bhYwzAaQ#sJezRxHvvGA8D_4iV7M6l985b-QhkQBAeGH_HXv48bs",
  },
  {
    title: "video (169)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/a1gEwLQb#G0JDBNyNvBcKZNSz10jpoM3BW2mj8txoBSXAasnDsSk",
  },
  {
    title: "video (170)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/39oXGTzb#fjJ7Bu1MQVBHRN3uPPZPQLIWeYsDyLcj6J6ywmusw8M",
  },
  {
    title: "video (172)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/r1oF2BCK#V-qNpNVVAk2Qqnb0by3jr_mC3MRbQpDPQMJrZ2ddR5w",
  },
  {
    title: "video (173)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/b9YWlCDb#6cTdiDfmEjbDrJ53xJ9r1TQ40QPGmIYKAy76S_XYaGY",
  },
  {
    title: "video (176)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/G5QTVLTA#Mwwi5ST7gFExAslcouKUzAKCWSCt5mfGTS1mLdELMRk",
  },
  {
    title: "video (177)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/uhZCFZLa#IcvwOXkzmR-n605hvmW1KnPDB0mcuIaGT_KjmdjCgDE",
  },
  {
    title: "video (180)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/T1gygSAL#gBLmvXz5s59NvYRX-RNfyDjYJP69m5Ng5g33XcIfIgo",
  },
  {
    title: "video (181)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/OgATlRqY#rYN7ydnGYiYUpuzHOoJKmpcqR-toLbRZt0SdyTgEe88",
  },
  {
    title: "video (185)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/L1xyQSBR#zLhq7zZm-FnnhjVQOcq7ToEvOkk23gf_BKv-X_wdUbw",
  },
  {
    title: "video (186)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/uwQShRIY#G3xXDmfqpCsklJ_By9eRet8kouQzBU0ZZEQrCPj23X4",
  },
  {
    title: "video (188)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/S4ITVBaK#aHPi_qNrPOO0yHnxoeNvVAa2uqauBix_k0ssGU7dBaY",
  },
  {
    title: "video (190)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/nghDCSgL#-7ld3ZAPMlgA2y2hTLVirhRxrp1H6N2K4Td1em49TuU",
  },
  {
    title: "video (193)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Opo03ARJ#60nFXeyaoSSxDuJIXtkG8iaFZnyXpfm05-PQrCwvcok",
  },
  {
    title: "video (195)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/PtZFDZYC#dMH-0V5JaK5Hka6u0Robd7UiKVBzgLIpOzACsBiWl6Q",
  },
  {
    title: "video (197)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/H8xwkarT#jSOqa04Vkh4rqLJEnE61pHBYDgfoMoFuzuagnivi9uE",
  },
  {
    title: "video (198)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/rtokULBL#aFOMv8ATLP-GAJYfxtgt89YHg1u3odJp6fJXg1BDQjE",
  },
  {
    title: "video (200)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/KgAykQgK#w6YcK3lRvzcH001vJPPGi-DiV9PtbN5PJe9fSE_e1lA",
  },
  {
    title: "video (205)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/DtRTSb7R#4-F84YFIsPxRyFuNt_JiuqgKzl1aHq9QKzEa6iqMJEI",
  },
  {
    title: "video (206)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/38QFmKoD#oX05hDZfftv5E3rThE0uGJ2PPLZ3C4priUx5uyG3UaY",
  },
  {
    title: "video (207)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/S4QgxRKI#LXBS4DcMVvrz8jq37zTG5psNu1-gpe9Zvevdh4yIbf8",
  },
  {
    title: "video (208)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/bwJCyTja#gJQDTIGmG4WWyquJ-wx-TXBTXqBJCI__0I36EoykZhs",
  },
  {
    title: "video (209)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/z5ojRazT#yG6Iwl8NZgh_1-fp43anYFuUIKwEOhaCysBTfM3A7ro",
  },
  {
    title: "video (211)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/jlpnhJ6L#-87wRyvHRA0805PyAAzVZKX05tOV-uuUNIuW9VRCRIg",
  },
  {
    title: "video (212)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/yppGCBAQ#mSLIlzP4v7yPT9KDdRi6ixIR77jDIY7vCxRfhYbghfU",
  },
  {
    title: "video (214)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/SwICUSwI#2R1b_rZKLQsqS9NvpMdPKGOwvLKcp0DryRmhpOU0VYc",
  },
  {
    title: "video (216)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/qkhGxBoD#yC4jEnAfAJVRD6dJl0BnjckdSilYjkmbV9feEax6s9k",
  },
  {
    title: "video (218)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/u8owQBQb#HjzuCvsQvL0EmkulR75kPohU9fye_z6hULXfL9bTGcc",
  },
  {
    title: "video (227)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/yhoxAC6Z#hq1zYVlHBwgAWxOZd-LL0XUi6eFb7O7ZdbuCJEsT4Xg",
  },
  {
    title: "video (228)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/S5pTkAAD#AhuTOb2NT945ZbhUnVLwdJI_STSqTyW586S_Dmwg7mA",
  },
  {
    title: "video (229)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/vl4hmKTC#dYj40m63gwkcJ5Lubj7tvq1emstn3Oy0hqhez2THgHs",
  },
  {
    title: "video (230)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/6oATSAYB#SlUy05hcMMcyYvwaQyjNmI9CtgbYy31COTSlYBNOC7M",
  },
  {
    title: "video (232)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/D1olzIAD#I1a_EGXVeBdCQuGhkAJa6JN3i9bkEggWgWk_3A7sIDo",
  },
  {
    title: "video (233)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/TswiiZZS#HUlatP3igTWQjSdiV6lGhxJIR-OeBJPvG80EWqw58EU",
  },
  {
    title: "video (234)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/uo4RFIpI#5FSRys-Qjdocl6iXEcqsKAd4o-dmL5jS0GaTkqXNwy0",
  },
  {
    title: "video (235)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Tkx3QaYY#Er7lBq2Waw7FybnFEuuE4dBr61Ewks1eJpRUJIodPIk",
  },
  {
    title: "video (239)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/rkQnlLga#o_vhjfXU96UGczoKdJ11dQiV7fn-CRHkug5b3IPoeHE",
  },
  {
    title: "video (240)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/j4RW1CLS#nG-t4hCsBhinRqBg2ucoqlSvwIZtmlU8-jpSdoCkBho",
  },
  {
    title: "video (242)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/mlgiXKrL#DulZMk0ixSFCUSTRpEemP4hCl4E5RYxj6vv4AOkaAKU",
  },
  {
    title: "video (243)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/G8xA3KbY#Mn00BBB94jJyr__Lwf84CfjGsj8E5w6BXQsHCCFAujk",
  },
  {
    title: "video (244)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/2w4VQJzD#ccVpeNADV0SS0WnmfoMK4xpxGRZfeVtd1_eoxMqsdrA",
  },
  {
    title: "video (245)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/jpYigA6C#DluIR3W2b6wuUwH3mROmZBQrmSp8Rlp4YRk63CFtofU",
  },
  {
    title: "video (246)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/roo3EZ5R#aJKf57hxB2syPuUGEAPC15C_McjYPhl-w9e0GTHZMFU",
  },
  {
    title: "video (247)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/3wQ1QKwb#Trg4UP4YYy2SCjiupHdvrwpPMBCzxUeB99YcNnQeWaw",
  },
  {
    title: "video (248)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/ex5W0DrR#2mBbUwE8ikCBQyI8YBAjCv-GNrDGahbOtH4I153j_EM",
  },
  {
    title: "video (249)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/T8pkDRoZ#HiuQaEuWBumjyNod2FYhDOfxTYboQ7-ZkLpbQypkvjA",
  },
  {
    title: "video (250)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/3s4m0IyJ#9zNhAByqf9BDL4qQrsuKCIv15hqkvFQVzZMMssuImpc",
  },
  {
    title: "video (251)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/epYzwARJ#qZlFaGz2_o0EgfbhhGLC6P4FY76QXJwW8TTJ9GeoUYE",
  },
  {
    title: "video (252)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/X4QV2Y5R#EPf_bJQTYRT_vf2WIf_rHrv-hLEOYdIatOoUT3mP4fI",
  },
  {
    title: "video (256)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Wp4jDBAD#EjZhsaIB4Y7F3reK8shD3fPLtbHdD_WFbyCNczt1-_Q",
  },
  {
    title: "video (258)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/esQhUaoI#pkTbTPLLKEbYZzjmdxtl_dZOSpBVhk6BgfVALCXEu0I",
  },
  {
    title: "video (260)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/e8ZCGSyS#wjnrxIo8QIKCpsMJIgzr1toDBlbxhtShXFBjPM9X3UU",
  },
  {
    title: "video (261)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/PwQlELqb#DbISukOmY2SyEiEKVyYz3WReLdz4TYDaKd-mYxGYo2U",
  },
  {
    title: "video (262)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/Ct4xGbBb#F4bu78N96CALNHMLcihSvBhyAajzR79_54HPhwp9F1E",
  },
  {
    title: "video (265)",
    thumbnail: "",
    megaVideoLink:
      "https://mega.nz/file/nkxl1QoA#DUIH7ZALMwE1ojBrS98JPjlhBt-lBkkSy_019F1HSGY",
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGO_URI as string;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(uri);
    console.log("✓ MongoDB connected");

    // Clear existing data
    console.log("\n🗑️  Clearing existing data...");
    await Comic.deleteMany({});
    await Video.deleteMany({});
    console.log("✓ Cleared Comics and Videos");

    // Insert sample comics
    console.log("\n📚 Inserting sample comics...");
    const insertedComics = await Comic.insertMany(sampleComics);
    console.log(`✓ Inserted ${insertedComics.length} comics`);

    // Insert sample videos
    console.log("\n🎬 Inserting sample videos...");
    const insertedVideos = await Video.insertMany(sampleVideos);
    console.log(`✓ Inserted ${insertedVideos.length} videos`);

    // Display summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 SEED SUMMARY");
    console.log("=".repeat(50));
    console.log(`✓ Total Comics: ${insertedComics.length}`);
    console.log(`✓ Total Videos: ${insertedVideos.length}`);
    console.log("=".repeat(50));

    // Display sample data
    console.log("\n📖 Sample Comics:");
    insertedComics.slice(0, 3).forEach((comic, index) => {
      console.log(`   ${index + 1}. ${comic.name} (ID: ${comic._id})`);
    });
    console.log(`   ... and ${insertedComics.length - 3} more\n`);

    console.log("🎥 Sample Videos:");
    insertedVideos.slice(0, 3).forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.title} (ID: ${video._id})`);
    });
    console.log(`   ... and ${insertedVideos.length - 3} more\n`);

    console.log("✅ Database seeding completed successfully!\n");

    // Disconnect
    await mongoose.disconnect();
    console.log("✓ MongoDB disconnected");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
