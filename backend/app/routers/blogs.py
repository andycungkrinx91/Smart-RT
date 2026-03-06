from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.sanitize import sanitize_css, sanitize_html
from app.core.storage import store_uploaded_image
from app.crud import add_blog, delete_blog, get_blog, list_blogs, update_blog
from app.deps import require_role
from app.models import User, UserRole
from app.routers.stats import notify_stats_changed
from app.schemas import BlogCreate, BlogOut, BlogUpdate


router = APIRouter(tags=["blogs"])


@router.post("/upload", dependencies=[Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT))])
async def upload_image(file: UploadFile = File(...)):
    stored = await store_uploaded_image(file)
    return {"url": stored.image_url}


@router.get("/blogs", response_model=list[BlogOut], dependencies=[Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT))])
async def blogs(db: AsyncSession = Depends(get_db)):
    items = await list_blogs(db)
    return [
        BlogOut(
            id=i.id,
            title=i.title,
            image_url=i.image_url,
            content_html=i.content_html or i.content,
            content_css=i.content_css,
            created_by=i.created_by,
            created_at=i.created_at,
        )
        for i in items
    ]


@router.get("/blogs/{blog_id}", response_model=BlogOut)
async def get_blog_ep(blog_id: int, db: AsyncSession = Depends(get_db)):
    item = await get_blog(db, blog_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog tidak ditemukan")
    return BlogOut(
        id=item.id,
        title=item.title,
        image_url=item.image_url,
        content_html=item.content_html or item.content,
        content_css=item.content_css,
        created_by=item.created_by,
        created_at=item.created_at,
    )


@router.post("/addblog", response_model=BlogOut)
async def add_blog_ep(
    payload: BlogCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT)),
):
    html = sanitize_html(payload.content_html)
    css = sanitize_css(payload.content_css)
    obj = await add_blog(
        db,
        title=payload.title,
        content_html=html,
        content_css=css,
        content_json=payload.content_json,
        image_url=payload.image_url,
        created_by=user.name[:32],
    )
    await notify_stats_changed()
    return BlogOut(
        id=obj.id,
        title=obj.title,
        image_url=obj.image_url,
        content_html=obj.content_html,
        content_css=obj.content_css,
        created_by=obj.created_by,
        created_at=obj.created_at,
    )


@router.put("/updateblog", response_model=BlogOut)
async def update_blog_ep(payload: BlogUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT))):
    obj = await update_blog(
        db,
        id=payload.id,
        title=payload.title,
        content_html=sanitize_html(payload.content_html) if payload.content_html is not None else None,
        content_css=sanitize_css(payload.content_css) if payload.content_css is not None else None,
        content_json=payload.content_json,
        image_url=payload.image_url,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog tidak ditemukan")
    await notify_stats_changed()
    return BlogOut(
        id=obj.id,
        title=obj.title,
        image_url=obj.image_url,
        content_html=obj.content_html or obj.content,
        content_css=obj.content_css,
        created_by=obj.created_by,
        created_at=obj.created_at,
    )


@router.delete("/deleteblog")
async def delete_blog_ep(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT))):
    ok = await delete_blog(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Blog berhasil dihapus"}
